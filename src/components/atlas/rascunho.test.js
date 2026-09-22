import { describe, it, expect, beforeEach } from "vitest";
import { guardarRascunho, lerRascunho, apagarRascunho, VALIDADE_MS } from "@/components/atlas/rascunho";

// localStorage em memória — o ambiente dos testes é node.
beforeEach(() => {
  const loja = new Map();
  globalThis.localStorage = {
    getItem: (k) => (loja.has(k) ? loja.get(k) : null),
    setItem: (k, v) => loja.set(k, String(v)),
    removeItem: (k) => loja.delete(k),
  };
});

describe("rascunho", () => {
  it("devolve o que se guardou", () => {
    guardarRascunho("entrada", { serie: "NS-1", modelo: "RX 60-25" });
    expect(lerRascunho("entrada")).toEqual({ serie: "NS-1", modelo: "RX 60-25" });
  });

  it("sem nada guardado devolve nada", () => {
    expect(lerRascunho("entrada")).toBe(null);
  });

  it("apagar apaga", () => {
    guardarRascunho("entrada", { serie: "NS-1" });
    apagarRascunho("entrada");
    expect(lerRascunho("entrada")).toBe(null);
  });

  it("um rascunho de ontem não volta — atrapalharia mais do que ajudava", () => {
    guardarRascunho("entrada", { serie: "NS-1" });
    expect(lerRascunho("entrada", { agora: Date.now() + VALIDADE_MS + 1000 })).toBe(null);
    // E foi mesmo apagado, não só ignorado.
    expect(lerRascunho("entrada")).toBe(null);
  });

  it("um rascunho de há uma hora ainda vale", () => {
    guardarRascunho("entrada", { serie: "NS-1" });
    expect(lerRascunho("entrada", { agora: Date.now() + 3600_000 })).toEqual({ serie: "NS-1" });
  });

  it("valor corrompido não parte nada", () => {
    globalThis.localStorage.setItem("atlas:rascunho:entrada", "{isto não é json");
    expect(lerRascunho("entrada")).toBe(null);
  });

  it("guardados diferentes não se misturam", () => {
    guardarRascunho("entrada", { a: 1 });
    guardarRascunho("saida", { b: 2 });
    expect(lerRascunho("entrada")).toEqual({ a: 1 });
    expect(lerRascunho("saida")).toEqual({ b: 2 });
  });

  it("sem armazenamento, a aplicação continua — apenas não se lembra", () => {
    globalThis.localStorage = {
      getItem: () => { throw new Error("bloqueado"); },
      setItem: () => { throw new Error("bloqueado"); },
      removeItem: () => { throw new Error("bloqueado"); },
    };
    expect(() => guardarRascunho("entrada", { a: 1 })).not.toThrow();
    expect(lerRascunho("entrada")).toBe(null);
    expect(() => apagarRascunho("entrada")).not.toThrow();
  });
});
