import { describe, it, expect } from "vitest";
import { MODOS, TAMANHOS, modoUsaEscala, GRELHA, CONE_TAMANHO, NS_CLASSE, CONE_NUM_CLASSE } from "@/components/atlas/viewPrefs";

describe("modos e tamanhos", () => {
  it("os cinco modos existem e têm nome e ícone", () => {
    expect(MODOS.map((m) => m.key)).toEqual(["cards", "grade", "mosaico", "lista", "detalhe"]);
    expect(MODOS.every((m) => m.label && m.Icone)).toBe(true);
  });

  it("o tamanho aplica-se aos modos com ícone e não a Lista nem a Detalhe", () => {
    expect(modoUsaEscala("cards")).toBe(true);
    expect(modoUsaEscala("grade")).toBe(true);
    expect(modoUsaEscala("mosaico")).toBe(true);
    expect(modoUsaEscala("lista")).toBe(false);
    expect(modoUsaEscala("detalhe")).toBe(false);
    expect(modoUsaEscala("inexistente")).toBe(false);
  });
});

describe("tabelas de classes", () => {
  const chaves = TAMANHOS.map((t) => t.key);

  // O Tailwind lê o código à procura de nomes de classe completos. Uma
  // combinação em falta não dá erro: gera `undefined` como classe e a grelha
  // desfaz-se em silêncio. Por isso é que isto se verifica.
  it.each(["cards", "grade", "mosaico"])("GRELHA.%s tem os três tamanhos, com classes completas", (modo) => {
    expect(Object.keys(GRELHA[modo]).sort()).toEqual([...chaves].sort());
    for (const t of chaves) {
      expect(GRELHA[modo][t]).toMatch(/^grid /);
      expect(GRELHA[modo][t]).not.toContain("undefined");
    }
  });

  it.each(["grade", "mosaico"])("CONE_TAMANHO.%s dá um número a cada tamanho, e cresce", (modo) => {
    expect(Object.keys(CONE_TAMANHO[modo]).sort()).toEqual([...chaves].sort());
    const { pequeno, medio, grande } = CONE_TAMANHO[modo];
    expect(pequeno).toBeLessThan(medio);
    expect(medio).toBeLessThan(grande);
  });

  it.each(["grade", "mosaico"])("NS_CLASSE.%s tem os três tamanhos", (modo) => {
    expect(Object.keys(NS_CLASSE[modo]).sort()).toEqual([...chaves].sort());
  });

  it("o número do cone tem classe para cada tamanho", () => {
    expect(Object.keys(CONE_NUM_CLASSE).sort()).toEqual([...chaves].sort());
  });
});
