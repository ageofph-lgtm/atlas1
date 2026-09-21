import { describe, it, expect, beforeEach } from "vitest";
import { instalarBase44, registo } from "@/test/base44Duplo";
import { registarRetorno, diasAlugada } from "@/components/atlas/registarRetorno";

let base44;
beforeEach(() => { base44 = instalarBase44(); });

const alugada = {
  id: "c1",
  maquina_id: "m1",
  serie: "NS-123",
  categoria: "str",
  estado: "em_aluguer",
  cone_cor: "amarelo",
  cone_numero: "7",
  data_saida: "2026-09-01T08:00:00Z",
};

describe("diasAlugada", () => {
  it("conta os dias desde a saída, arredondando para cima", () => {
    // Math.ceil: qualquer fração de dia já conta como um dia inteiro de aluguer.
    expect(diasAlugada(alugada, new Date("2026-09-04T08:00:00Z"))).toBe(3);
    expect(diasAlugada(alugada, new Date("2026-09-04T08:00:01Z"))).toBe(4);
  });

  it("dá zero quando a máquina nunca saiu", () => {
    expect(diasAlugada({ serie: "NS-1" })).toBe(0);
    expect(diasAlugada(null)).toBe(0);
  });
});

describe("registarRetorno", () => {
  it("fecha o aluguer com os dias contados", async () => {
    await registarRetorno({ ...alugada }, { autor: "Logística", coneNumero: "9" });

    const fecho = registo.atualizados.find((u) => u.id === "c1");
    expect(fecho.dados.estado).toBe("fechado");
    expect(fecho.dados.data_retorno).toBeTruthy();
    expect(fecho.dados.dias_alugada).toBeGreaterThan(0);
  });

  it("tira o cone ao ciclo que fecha — o cone vai com a máquina para o ciclo novo", async () => {
    await registarRetorno({ ...alugada }, { autor: "Logística", coneNumero: "9" });

    const fecho = registo.atualizados.find((u) => u.id === "c1");
    expect(fecho.dados.cone_cor).toBe(null);
    expect(fecho.dados.cone_numero).toBe(null);
  });

  it("reabre um ciclo no pátio — sem isto a máquina voltava e desaparecia do inventário", async () => {
    // Este é o bug da máquina fantasma: fechar o aluguer sozinho deixava a
    // série só com um ciclo fechado, e o inventário esconde os fechados.
    const r = await registarRetorno({ ...alugada }, { autor: "Logística", coneNumero: "9" });

    const novo = registo.criados.find((c) => c.entidade === "Ciclo");
    expect(novo).toBeTruthy();
    expect(r.novoCicloId).toBeTruthy();
    expect(novo.dados.serie).toBe("NS-123");
    expect(novo.dados.maquina_id).toBe("m1");
    expect(novo.dados.categoria).toBe("str");
    expect(novo.dados.estado).toBe("classificada");
    expect(novo.dados.cone_numero).toBe("9");
    expect(novo.dados.cone_cor).toBe("amarelo");
  });

  it("aceita voltar já pronta quando quem regista o sabe", async () => {
    await registarRetorno({ ...alugada }, { autor: "X", coneNumero: "9", estadoRegresso: "pronta" });
    const novo = registo.criados.find((c) => c.entidade === "Ciclo");
    expect(novo.dados.estado).toBe("pronta");
    expect(novo.dados.data_pronta).toBeTruthy();
  });

  it("com reabrir:false fecha e mais nada — quem chama trata do ciclo novo", async () => {
    // É o caso da reentrada pela página de Entrada, que recolhe categoria,
    // cone e notas de raiz e cria o ciclo à sua maneira.
    const r = await registarRetorno({ ...alugada }, { autor: "X", reabrir: false });

    expect(r.novoCicloId).toBe(null);
    expect(registo.criados.filter((c) => c.entidade === "Ciclo")).toHaveLength(0);
    expect(registo.atualizados.find((u) => u.id === "c1").dados.estado).toBe("fechado");
  });

  it("deixa rasto no histórico do ciclo, dos dois lados", async () => {
    await registarRetorno({ ...alugada }, { autor: "Logística", coneNumero: "9" });
    const eventos = registo.criados.filter((c) => c.entidade === "EventoCiclo");
    expect(eventos).toHaveLength(2);
    expect(eventos[0].dados.para_estado).toBe("fechado");
    expect(eventos[1].dados.para_estado).toBe("classificada");
  });

  it("recusa um cone que já está em uso, sem gravar nada", async () => {
    base44.entities.Ciclo.linhas.push({
      id: "outro", serie: "NS-999", cone_cor: "amarelo", cone_numero: "9", estado: "pronta",
    });

    const r = await registarRetorno({ ...alugada }, { autor: "X", coneNumero: "9" });

    expect(r.ok).toBe(false);
    expect(r.erro).toContain("NS-999");
    expect(registo.atualizados).toHaveLength(0);
    expect(registo.criados).toHaveLength(0);
  });

  it("não valida o cone quando não vai reabrir ciclo nenhum", async () => {
    base44.entities.Ciclo.linhas.push({
      id: "outro", serie: "NS-999", cone_cor: "amarelo", cone_numero: "9", estado: "pronta",
    });
    const r = await registarRetorno({ ...alugada }, { autor: "X", coneNumero: "9", reabrir: false });
    expect(r.ok).toBe(true);
  });
});
