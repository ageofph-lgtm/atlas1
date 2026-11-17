import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  alternarNS,
  limparNS,
  nsSelecionados,
  subscreverNS,
  textoDosNS,
} from "@/lib/nsClipboard";

describe("seleção de NS para copiar", () => {
  beforeEach(() => limparNS());

  it("guarda pela ordem em que foram clicados", () => {
    alternarNS("516");
    alternarNS("517");
    alternarNS("900");
    expect(nsSelecionados()).toEqual(["516", "517", "900"]);
  });

  it("não guarda duplicados nem espaços à volta", () => {
    alternarNS(" 516 ");
    alternarNS("516");
    // O segundo clique é o mesmo NS: retira-o, não o repete.
    expect(nsSelecionados()).toEqual([]);
  });

  it("volta a clicar num NS tira-o da lista", () => {
    alternarNS("516");
    alternarNS("517");
    alternarNS("516");
    expect(nsSelecionados()).toEqual(["517"]);
  });

  it("um NS por linha, para colar numa folha", () => {
    alternarNS("516");
    alternarNS("517");
    expect(textoDosNS(nsSelecionados())).toBe("516\n517");
    expect(textoDosNS(["516"])).toBe("516");
  });

  it("ignora valores vazios", () => {
    alternarNS("");
    alternarNS(undefined);
    expect(nsSelecionados()).toEqual([]);
  });

  it("avisa quem está à escuta a cada mudança", () => {
    const ouvinte = vi.fn();
    const cancelar = subscreverNS(ouvinte);
    alternarNS("516");
    limparNS();
    expect(ouvinte).toHaveBeenCalledTimes(2);
    cancelar();
    alternarNS("517");
    expect(ouvinte).toHaveBeenCalledTimes(2);
  });

  it("limpar esquece a lista", () => {
    alternarNS("516");
    limparNS();
    expect(nsSelecionados()).toEqual([]);
  });
});