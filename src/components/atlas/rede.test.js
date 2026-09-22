import { describe, it, expect, afterEach, vi } from "vitest";
import { estaOnline, exigirRede, ErroSemRede } from "@/components/atlas/rede";

// `navigator` é só de leitura em node; substitui-se com stubGlobal.
const fingirRede = (online) => vi.stubGlobal("navigator", { onLine: online });
afterEach(() => vi.unstubAllGlobals());

describe("estaOnline", () => {
  it("lê o estado do browser", () => {
    fingirRede(true);
    expect(estaOnline()).toBe(true);
    fingirRede(false);
    expect(estaOnline()).toBe(false);
  });

  it("na dúvida assume que há rede — nunca bloqueia quem podia trabalhar", () => {
    vi.stubGlobal("navigator", undefined);
    expect(estaOnline()).toBe(true);
    vi.stubGlobal("navigator", {});
    expect(estaOnline()).toBe(true);
  });
});

describe("exigirRede", () => {
  it("deixa passar quando há rede", () => {
    fingirRede(true);
    expect(() => exigirRede("Registar a entrada")).not.toThrow();
  });

  it("recusa antes de começar, e explica-se", () => {
    fingirRede(false);
    expect(() => exigirRede("Registar a entrada")).toThrow(ErroSemRede);
    try {
      exigirRede("Registar a entrada");
    } catch (e) {
      expect(e.semRede).toBe(true);
      expect(e.message).toContain("Registar a entrada");
      expect(e.message).toContain("fica guardado");
    }
  });
});
