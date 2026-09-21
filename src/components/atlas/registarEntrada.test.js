import { describe, it, expect, beforeEach } from "vitest";
import { instalarBase44, registo } from "@/test/base44Duplo";
import { registarEntrada } from "@/components/atlas/registarEntrada";

let base44;
beforeEach(() => { base44 = instalarBase44(); });

const base = {
  serie: "NS-NOVA",
  modelo: "RX 60-25",
  ano: "2021",
  categoria: "str",
  coneNumero: "7",
  autor: "Logística",
  specs: { mastro: "triplex", acessorios: ["sideshift"] },
};

const cicloCriado = () => registo.criados.find((c) => c.entidade === "Ciclo")?.dados;
const eventos = () => registo.criados.filter((c) => c.entidade === "EventoCiclo").map((c) => c.dados);

describe("entrada de uma máquina nova", () => {
  it("cria a máquina e o ciclo, e devolve os ids", async () => {
    const r = await registarEntrada(base);

    expect(r.ok).toBe(true);
    expect(r.cicloId).toBeTruthy();
    const maquina = registo.criados.find((c) => c.entidade === "Maquina")?.dados;
    expect(maquina.serie).toBe("NS-NOVA");
    expect(maquina.modelo).toBe("RX 60-25");
    expect(maquina.mastro).toBe("triplex");
    expect(maquina.acessorios).toEqual(["sideshift"]);
  });

  it("o ciclo nasce com a categoria, o cone da categoria e as datas", async () => {
    await registarEntrada(base);
    const c = cicloCriado();

    expect(c.categoria).toBe("str");
    expect(c.cone_cor).toBe("amarelo");
    expect(c.cone_numero).toBe("7");
    expect(c.estado).toBe("classificada");
    expect(c.data_entrada).toBeTruthy();
    expect(c.data_classificacao).toBeTruthy();
    expect(c.prioridade).toBe(false);
  });

  it("deixa dois registos no histórico: a entrada e a classificação", async () => {
    await registarEntrada(base);
    const ev = eventos();

    expect(ev).toHaveLength(2);
    expect(ev[0].para_estado).toBe("entrada");
    expect(ev[0].nota).toBe("Registo de entrada");
    expect(ev[1].de_estado).toBe("entrada");
    expect(ev[1].para_estado).toBe("classificada");
  });

  it("avisa a gestão de que entrou uma máquina", async () => {
    await registarEntrada(base);
    const msg = registo.criados.find((c) => c.entidade === "Mensagem")?.dados;
    expect(msg.destino).toBe("gestao");
    expect(msg.titulo).toContain("Entrada");
    expect(msg.serie).toBe("NS-NOVA");
  });
});

describe("categorias sem fluxo de preparação", () => {
  it("sucata entra em 'indefinido', mesmo que lhe peçam outro estado", async () => {
    await registarEntrada({ ...base, categoria: "sucata", estadoInicial: "pronta", coneNumero: "" });
    expect(cicloCriado().estado).toBe("indefinido");
    expect(eventos()[1].nota).toBe("Sem estado de preparação (sucata/indefinida)");
  });

  it("a sucata não leva cone — é a única categoria sem cor atribuída", async () => {
    await registarEntrada({ ...base, categoria: "sucata", coneNumero: "7" });
    const c = cicloCriado();
    expect(c.cone_cor).toBe(null);
    expect(c.cone_numero).toBe(null);
  });

  it("mas a indefinida leva, porque está no pátio e tem de ser encontrada", async () => {
    // Não ter estado de preparação não é o mesmo que não estar lá fora.
    await registarEntrada({ ...base, categoria: "indefinida", coneNumero: "7" });
    const c = cicloCriado();
    expect(c.cone_cor).toBe("amarelo");
    expect(c.cone_numero).toBe("7");
    expect(c.estado).toBe("indefinido");
  });
});

describe("entrada direta num estado escolhido", () => {
  it("'pronta' grava também a data de conclusão", async () => {
    await registarEntrada({ ...base, estadoInicial: "pronta" });
    const c = cicloCriado();
    expect(c.estado).toBe("pronta");
    expect(c.data_pronta).toBeTruthy();
    expect(eventos()[1].nota).toBe("Entrada direta — pronta");
  });

  it("'manutencao' não grava data de conclusão", async () => {
    await registarEntrada({ ...base, estadoInicial: "manutencao" });
    expect(cicloCriado().data_pronta).toBeUndefined();
    expect(eventos()[1].nota).toBe("Entrada direta — manutenção");
  });
});

describe("travas", () => {
  it("recusa uma máquina que ainda está no pátio — é assim que não se duplica", async () => {
    base44.entities.Ciclo.linhas.push({ id: "aberto", serie: "NS-NOVA", estado: "pronta", data_entrada: "2026-01-01T00:00:00Z" });

    const r = await registarEntrada(base);

    expect(r.ok).toBe(false);
    expect(r.tipoErro).toBe("no_patio");
    expect(registo.criados.filter((c) => c.entidade === "Ciclo")).toHaveLength(0);
  });

  it("recusa uma máquina alugada enquanto não confirmarem a reentrada", async () => {
    // Uma máquina em aluguer TEM data_saida — foi por isso que o guarda
    // antigo não a via e a deixava registar outra vez.
    base44.entities.Ciclo.linhas.push({ id: "alug", serie: "NS-NOVA", estado: "em_aluguer", data_saida: "2026-09-01T00:00:00Z" });

    const r = await registarEntrada(base);

    expect(r.ok).toBe(false);
    expect(r.tipoErro).toBe("fora_do_patio");
    expect(r.ciclo.id).toBe("alug");
    expect(registo.criados.filter((c) => c.entidade === "Ciclo")).toHaveLength(0);
  });

  it("recusa um cone que outra máquina no pátio já tem, sem gravar nada", async () => {
    base44.entities.Ciclo.linhas.push({ id: "outra", serie: "NS-OCUPA", cone_cor: "amarelo", cone_numero: "7", estado: "pronta" });

    const r = await registarEntrada(base);

    expect(r.ok).toBe(false);
    expect(r.tipoErro).toBe("cone_ocupado");
    expect(r.erro).toContain("NS-OCUPA");
    expect(registo.criados).toHaveLength(0);
    expect(registo.atualizados).toHaveLength(0);
  });

  it("um ciclo fechado não trava nada — é história", async () => {
    base44.entities.Ciclo.linhas.push({ id: "velho", serie: "NS-NOVA", estado: "fechado" });
    expect((await registarEntrada(base)).ok).toBe(true);
  });
});

describe("reentrada de uma máquina que estava alugada", () => {
  const comAluguer = () => {
    base44.entities.Ciclo.linhas.push({
      id: "alug", maquina_id: "m1", serie: "NS-NOVA", categoria: "str",
      estado: "em_aluguer", cone_cor: "amarelo", cone_numero: "3",
      data_saida: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
  };

  it("fecha o aluguer anterior e abre um ciclo novo", async () => {
    comAluguer();
    const r = await registarEntrada({ ...base, reentradaConfirmada: true });

    expect(r.ok).toBe(true);
    const fecho = registo.atualizados.find((u) => u.id === "alug");
    expect(fecho.dados.estado).toBe("fechado");
    expect(fecho.dados.dias_alugada).toBeGreaterThan(0);
    expect(cicloCriado().estado).toBe("classificada");
  });

  it("conta os dias e di-lo no histórico", async () => {
    comAluguer();
    const r = await registarEntrada({ ...base, reentradaConfirmada: true });

    expect(r.diasDoAluguer).toBeGreaterThan(0);
    const nota = eventos().find((e) => e.nota.startsWith("Reentrada após aluguer"));
    expect(nota.nota).toContain(`${r.diasDoAluguer} dias`);
  });

  it("o histórico diz que foi reentrada, não entrada nova", async () => {
    comAluguer();
    await registarEntrada({ ...base, reentradaConfirmada: true });
    // O primeiro evento é o do retorno, escrito ao fechar o aluguer; os do
    // ciclo novo vêm a seguir.
    expect(eventos().map((e) => e.nota)).toContain("Reentrada no pátio");
    expect(eventos().map((e) => e.nota)).not.toContain("Registo de entrada");
  });

  it("não deixa o aluguer aberto se o registo do retorno falhar", async () => {
    comAluguer();
    base44.entities.Ciclo.update.mockRejectedValueOnce(new Error("sem rede"));

    await expect(registarEntrada({ ...base, reentradaConfirmada: true })).rejects.toThrow("sem rede");
    expect(registo.criados.filter((c) => c.entidade === "Ciclo")).toHaveLength(0);
  });
});

describe("máquina já conhecida", () => {
  const existente = {
    id: "m1", serie: "NS-NOVA", modelo: "RX 60-25", ano: "2019",
    mastro: "duplex", joystick: "sim", acessorios: ["espelho"], bateria: "litio",
  };

  it("atualiza em vez de criar outra", async () => {
    await registarEntrada({ ...base, existingMaquina: existente });

    expect(registo.criados.filter((c) => c.entidade === "Maquina")).toHaveLength(0);
    expect(registo.atualizados.find((u) => u.id === "m1")).toBeTruthy();
    expect(cicloCriado().maquina_id).toBe("m1");
  });

  it("o que vier em branco não apaga o que já lá estava", async () => {
    await registarEntrada({
      ...base, existingMaquina: existente,
      modelo: "", ano: "", specs: { mastro: "", acessorios: [] },
    });

    const u = registo.atualizados.find((x) => x.id === "m1").dados;
    expect(u.modelo).toBe("RX 60-25");
    expect(u.ano).toBe("2019");
    expect(u.mastro).toBe("duplex");
    expect(u.acessorios).toEqual(["espelho"]);
  });

  it("mas o que vier preenchido substitui", async () => {
    await registarEntrada({
      ...base, existingMaquina: existente,
      modelo: "RX 20-16", specs: { mastro: "triplex", acessorios: ["sideshift"] },
    });

    const u = registo.atualizados.find((x) => x.id === "m1").dados;
    expect(u.modelo).toBe("RX 20-16");
    expect(u.mastro).toBe("triplex");
    expect(u.acessorios).toEqual(["sideshift"]);
  });
});
