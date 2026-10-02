import { describe, it, expect, beforeEach } from "vitest";
import { instalarBase44, registo } from "@/test/base44Duplo";
import { planearCorrecao, aplicarCorrecao, notaDaCorrecao, FOLGA_RETORNO_MS } from "@/components/atlas/corrigirSaida";

// O caso medido a 02/10/2026: saída para aluguer às 09:36, "retorno" de 1 dia
// às 09:37 para desfazer o engano, que abriu um ciclo novo no pátio.
const SAIDA = "2026-10-02T09:36:41Z";
const RETORNO = "2026-10-02T09:37:20Z";

const aluguerComRetorno = {
  id: "A",
  serie: "511903J00082",
  estado: "fechado",
  tipo_saida: "alugada",
  data_entrada: "2026-09-14T13:26:14Z",
  data_saida: SAIDA,
  data_retorno: RETORNO,
  dias_alugada: 1,
  reserva_cliente: "Dispnal",
};
const cicloDoRetorno = {
  id: "B",
  serie: "511903J00082",
  estado: "pronta",
  categoria: "recon",
  cone_cor: "azul",
  cone_numero: "12",
  data_entrada: RETORNO,
};
const emAluguer = { id: "C", serie: "NS-1", estado: "em_aluguer", tipo_saida: "alugada", data_saida: SAIDA };
const vendida = { id: "D", serie: "NS-2", estado: "fechado", tipo_saida: "vendida", data_saida: SAIDA };

describe("planearCorrecao — aluguer → venda", () => {
  it("em aluguer: fecha o ciclo como venda", () => {
    const p = planearCorrecao(emAluguer, [emAluguer], "vendida");
    expect(p.ok).toBe(true);
    expect(p.atualizar).toEqual({ tipo_saida: "vendida", estado: "fechado", data_retorno: null, dias_alugada: null });
    expect(p.apagar).toBe(null);
    expect(p.nota).toBe("Saída corrigida: aluguer → venda");
  });

  it("com um retorno feito para desfazer o engano: anula o retorno e apaga o ciclo que ele abriu", () => {
    const p = planearCorrecao(aluguerComRetorno, [aluguerComRetorno, cicloDoRetorno], "vendida");
    expect(p.ok).toBe(true);
    expect(p.atualizar).toEqual({ tipo_saida: "vendida", estado: "fechado", data_retorno: null, dias_alugada: null });
    expect(p.apagar?.id).toBe("B");
    expect(p.nota).toBe("Saída corrigida: aluguer → venda — o retorno de 02/10/2026 foi anulado");
    expect(p.explicacao.join(" ")).toContain("cone azul 12");
  });

  it("os ciclos de antes da saída não contam", () => {
    const anterior = { id: "Z", serie: "511903J00082", estado: "fechado", data_entrada: "2026-01-01T10:00:00Z", data_saida: "2026-02-01T10:00:00Z" };
    const p = planearCorrecao(aluguerComRetorno, [anterior, aluguerComRetorno, cicloDoRetorno], "vendida");
    expect(p.ok).toBe(true);
    expect(p.apagar?.id).toBe("B");
  });

  it("se o ciclo do retorno já não existe, só corrige a saída", () => {
    const p = planearCorrecao(aluguerComRetorno, [aluguerComRetorno], "vendida");
    expect(p.ok).toBe(true);
    expect(p.apagar).toBe(null);
  });

  it("aceita o ciclo do regresso aberto uns segundos depois (retorno pela Entrada)", () => {
    const pelaEntrada = { ...cicloDoRetorno, data_entrada: "2026-10-02T09:37:31Z" };
    expect(planearCorrecao(aluguerComRetorno, [pelaEntrada], "vendida").apagar?.id).toBe("B");
  });

  it("recusa se a máquina voltou a sair depois do retorno — apagaria uma saída verdadeira", () => {
    const saiuOutraVez = { ...cicloDoRetorno, estado: "em_aluguer", data_saida: "2026-10-20T10:00:00Z" };
    const p = planearCorrecao(aluguerComRetorno, [aluguerComRetorno, saiuOutraVez], "vendida");
    expect(p.ok).toBe(false);
    expect(p.motivo).toContain("voltou a sair");
  });

  it("recusa quando há mais de um ciclo depois do retorno", () => {
    const outro = { ...cicloDoRetorno, id: "E", data_entrada: "2026-10-05T10:00:00Z" };
    expect(planearCorrecao(aluguerComRetorno, [cicloDoRetorno, outro], "vendida").ok).toBe(false);
  });

  it("recusa um ciclo seguinte que entrou muito depois do retorno — não foi ele que o abriu", () => {
    const tarde = { ...cicloDoRetorno, data_entrada: new Date(new Date(RETORNO).getTime() + FOLGA_RETORNO_MS + 1000).toISOString() };
    expect(planearCorrecao(aluguerComRetorno, [tarde], "vendida").ok).toBe(false);
  });
});

describe("planearCorrecao — venda → aluguer", () => {
  it("reabre o ciclo como aluguer, à espera de retorno", () => {
    const p = planearCorrecao(vendida, [vendida], "alugada");
    expect(p.ok).toBe(true);
    expect(p.atualizar).toEqual({ tipo_saida: "alugada", estado: "em_aluguer", data_retorno: null, dias_alugada: null });
    expect(p.nota).toBe("Saída corrigida: venda → aluguer");
  });

  it("recusa se a máquina voltou a entrar depois da venda", () => {
    const voltou = { id: "F", serie: "NS-2", estado: "classificada", data_entrada: "2026-10-10T10:00:00Z" };
    expect(planearCorrecao(vendida, [vendida, voltou], "alugada").ok).toBe(false);
  });
});

describe("planearCorrecao — o que não é correção", () => {
  it("um ciclo que nunca saiu não tem tipo de saída para corrigir — foi o erro de 02/10", () => {
    const p = planearCorrecao(cicloDoRetorno, [], "vendida");
    expect(p.ok).toBe(false);
    expect(p.motivo).toContain("não saiu");
  });

  it("o mesmo tipo não é correção, e um ciclo antigo sem tipo conta como aluguer", () => {
    expect(planearCorrecao(vendida, [], "vendida").ok).toBe(false);
    expect(planearCorrecao({ ...emAluguer, tipo_saida: undefined }, [], "alugada").ok).toBe(false);
    expect(planearCorrecao({ ...emAluguer, tipo_saida: undefined }, [], "vendida").ok).toBe(true);
  });

  it("tipo desconhecido", () => {
    expect(planearCorrecao(emAluguer, [], "emprestada").ok).toBe(false);
  });
});

describe("aplicarCorrecao", () => {
  let base44;
  beforeEach(() => {
    base44 = instalarBase44({
      Ciclo: [{ ...aluguerComRetorno }, { ...cicloDoRetorno }],
      EventoCiclo: [
        { id: "ev1", ciclo_id: "A", nota: "Saída para aluguer — Dispnal" },
        { id: "ev2", ciclo_id: "A", nota: "Retorno — 1 dias alugada" },
        { id: "ev3", ciclo_id: "B", nota: "Regresso ao pátio após 1 dias de aluguer" },
        { id: "ev4", ciclo_id: "B", nota: "Estado alterado manualmente" },
      ],
    });
  });

  it("apaga o ciclo do retorno com os movimentos dele, corrige a saída e deixa nota", async () => {
    const plano = planearCorrecao(aluguerComRetorno, [aluguerComRetorno, cicloDoRetorno], "vendida");
    const r = await aplicarCorrecao(aluguerComRetorno, plano, { autor: "Admin" });

    expect(r).toEqual({ cicloApagado: "B", eventosApagados: 2 });
    expect(registo.apagados).toEqual([
      { entidade: "EventoCiclo", id: "ev3" },
      { entidade: "EventoCiclo", id: "ev4" },
      { entidade: "Ciclo", id: "B" },
    ]);
    const ciclos = base44.entities.Ciclo.linhas;
    expect(ciclos.map((c) => c.id)).toEqual(["A"]);
    expect(ciclos[0]).toMatchObject({ tipo_saida: "vendida", estado: "fechado", data_retorno: null, dias_alugada: null, data_saida: SAIDA });
    expect(registo.criados).toEqual([
      {
        entidade: "EventoCiclo",
        dados: {
          ciclo_id: "A",
          serie: "511903J00082",
          de_estado: "fechado",
          para_estado: "fechado",
          autor: "Admin",
          nota: notaDaCorrecao("alugada", "vendida", RETORNO),
        },
      },
    ]);
    // Os movimentos do ciclo da saída ficam: a história conta o engano e a correção.
    expect(base44.entities.EventoCiclo.linhas.filter((e) => e.ciclo_id === "A").map((e) => e.nota)).toEqual([
      "Saída para aluguer — Dispnal",
      "Retorno — 1 dias alugada",
      "Saída corrigida: aluguer → venda — o retorno de 02/10/2026 foi anulado",
    ]);
  });

  it("apaga antes de corrigir: se falhar a meio, repetir acaba o que faltou", async () => {
    const plano = planearCorrecao(aluguerComRetorno, [aluguerComRetorno, cicloDoRetorno], "vendida");
    base44.entities.Ciclo.update.mockRejectedValueOnce(new Error("rede caiu"));
    await expect(aplicarCorrecao(aluguerComRetorno, plano, { autor: "Admin" })).rejects.toThrow("rede caiu");

    // O ciclo do retorno já foi; a saída ainda diz aluguer. Planear outra vez
    // não encontra nada para apagar e corrige a saída.
    const atual = base44.entities.Ciclo.linhas.find((c) => c.id === "A");
    const outraVez = planearCorrecao(atual, base44.entities.Ciclo.linhas, "vendida");
    expect(outraVez.ok).toBe(true);
    expect(outraVez.apagar).toBe(null);
    await aplicarCorrecao(atual, outraVez, { autor: "Admin" });
    expect(base44.entities.Ciclo.linhas.find((c) => c.id === "A").tipo_saida).toBe("vendida");
  });

  it("não grava um plano recusado", async () => {
    await expect(aplicarCorrecao(cicloDoRetorno, planearCorrecao(cicloDoRetorno, [], "vendida"))).rejects.toThrow("não saiu");
    expect(registo.atualizados).toEqual([]);
  });
});
