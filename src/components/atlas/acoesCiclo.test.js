import { describe, it, expect, beforeEach } from "vitest";
import { instalarBase44, registo } from "@/test/base44Duplo";
import { podeAutorizar, podeMarcarPronta, definirPrioridade, marcarPronta } from "@/components/atlas/acoesCiclo";

beforeEach(() => { instalarBase44(); });

const c = (extra) => ({ id: "c1", serie: "NS-1", categoria: "str", estado: "classificada", ...extra });

describe("podeAutorizar", () => {
  it("aceita os dois estados que o backend aceita", () => {
    expect(podeAutorizar(c({ estado: "classificada" }))).toBe(true);
    expect(podeAutorizar(c({ estado: "manutencao" }))).toBe(true);
  });

  it("recusa tudo o resto", () => {
    for (const estado of ["pronta", "autorizada", "em_execucao", "em_aluguer", "retorno", "fechado", "entrada"]) {
      expect(podeAutorizar(c({ estado }))).toBe(false);
    }
  });

  it("recusa sucata em 'classificada' — o estado efetivo dela é indefinido", () => {
    // O backend recusa a categoria; aqui recusa-se antes, pelo estado efetivo.
    expect(podeAutorizar(c({ categoria: "sucata", estado: "classificada" }))).toBe(false);
  });
});

describe("podeMarcarPronta", () => {
  it("aceita uma máquina do fluxo que ainda não está pronta", () => {
    expect(podeMarcarPronta(c({ estado: "em_execucao" }))).toBe(true);
  });

  it("recusa o que já está pronto e o que não segue o fluxo", () => {
    expect(podeMarcarPronta(c({ estado: "pronta" }))).toBe(false);
    expect(podeMarcarPronta(c({ categoria: "sucata" }))).toBe(false);
    expect(podeMarcarPronta(c({ categoria: "indefinida" }))).toBe(false);
  });
});

describe("definirPrioridade", () => {
  it("grava o valor que lhe derem, não o contrário do atual", async () => {
    // Em lote, "marcar todas" tem de pôr todas a true, mesmo as que já estavam.
    const r = await definirPrioridade(c({ prioridade: true }), true);
    expect(registo.atualizados[0].dados).toEqual({ prioridade: true });
    expect(r.prioridade).toBe(true);
  });

  it("desliga quando lhe pedem", async () => {
    await definirPrioridade(c({ prioridade: true }), false);
    expect(registo.atualizados[0].dados).toEqual({ prioridade: false });
  });
});

describe("marcarPronta", () => {
  it("grava o estado e a data de conclusão", async () => {
    await marcarPronta(c({ estado: "em_execucao" }), { autor: "Gestor" });
    const u = registo.atualizados.find((x) => x.id === "c1");
    expect(u.dados.estado).toBe("pronta");
    expect(u.dados.data_pronta).toBeTruthy();
  });

  it("deixa rasto no histórico, com o estado de onde veio", async () => {
    await marcarPronta(c({ estado: "em_execucao" }), { autor: "Gestor" });
    const ev = registo.criados.find((x) => x.entidade === "EventoCiclo");
    expect(ev.dados.de_estado).toBe("em_execucao");
    expect(ev.dados.para_estado).toBe("pronta");
    expect(ev.dados.autor).toBe("Gestor");
  });

  it("avisa quem estava à espera dela", async () => {
    await marcarPronta(c(), { autor: "Gestor" });
    const msgs = registo.criados.filter((x) => x.entidade === "Mensagem");
    expect(msgs.length).toBeGreaterThan(0);
    expect(msgs.map((m) => m.dados.destino)).toContain("logistica");
    expect(msgs.map((m) => m.dados.destino)).toContain("gestao");
  });
});
