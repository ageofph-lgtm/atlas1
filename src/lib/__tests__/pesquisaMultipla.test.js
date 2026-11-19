import { describe, it, expect } from "vitest";
import {
  normalizarSerie,
  listaDeSeries,
  serieCorresponde,
  resumoDaPesquisaMultipla,
} from "@/lib/pesquisaMultipla";
import { matchCicloSearch } from "@/components/atlas/searchUtils";

describe("normalizarSerie", () => {
  it("tira símbolos e passa a maiúsculas", () => {
    expect(normalizarSerie("f2032-1y 00397")).toBe("F20321Y00397");
    expect(normalizarSerie(null)).toBe("");
  });
});

describe("listaDeSeries", () => {
  it("lê uma lista separada por vírgulas", () => {
    expect(listaDeSeries("F20321Y00397, 516225N00592")).toEqual(["F20321Y00397", "516225N00592"]);
  });

  it("lê uma lista por linhas e tira duplicados", () => {
    expect(listaDeSeries("F20321Y00397\n516225N00592\nF20321Y00397")).toEqual([
      "F20321Y00397",
      "516225N00592",
    ]);
  });

  it("aceita vários NS inteiros separados só por espaços", () => {
    expect(listaDeSeries("F20321Y00397 516225N00592")).toEqual(["F20321Y00397", "516225N00592"]);
  });

  it("aceita fins de série separados por ponto e vírgula", () => {
    expect(listaDeSeries("00592; 00845")).toEqual(["00592", "00845"]);
  });

  it("não rouba as pesquisas de um só termo", () => {
    expect(listaDeSeries("exv 14")).toBeNull();
    expect(listaDeSeries("amarelo 12")).toBeNull();
    expect(listaDeSeries("triplex 4500")).toBeNull();
    expect(listaDeSeries("rx60 25")).toBeNull();
    expect(listaDeSeries("F20321Y00397")).toBeNull();
    expect(listaDeSeries("F20321Y00397,")).toBeNull();
    expect(listaDeSeries("")).toBeNull();
  });
});

describe("serieCorresponde", () => {
  it("encontra o fim da série", () => {
    expect(serieCorresponde("F20321Y00397", "00397")).toBe(true);
  });

  it("não encontra o que não lá está", () => {
    expect(serieCorresponde("F20321Y00397", "00398")).toBe(false);
  });
});

describe("resumoDaPesquisaMultipla", () => {
  it("conta as máquinas de cada NS pela ordem pedida", () => {
    const ciclos = [
      { serie: "F20321Y00397" },
      { serie: "F20321Y00397" },
      { serie: "W40185V00016" },
    ];
    expect(resumoDaPesquisaMultipla(["F20321Y00397", "516225N00592"], ciclos)).toEqual([
      { ns: "F20321Y00397", encontradas: 2 },
      { ns: "516225N00592", encontradas: 0 },
    ]);
  });
});

describe("matchCicloSearch com vários NS", () => {
  const ciclo = { serie: "F20321Y00397" };

  it("mostra a máquina se a série for um dos NS", () => {
    expect(matchCicloSearch(ciclo, null, "F20321Y00397, 516225N00592")).toBe(true);
  });

  it("esconde a máquina quando a série não é nenhum deles", () => {
    expect(matchCicloSearch(ciclo, null, "516225N00592, W40185V00016")).toBe(false);
  });

  it("a pesquisa de um só termo continua como era", () => {
    expect(matchCicloSearch(ciclo, null, "00397")).toBe(true);
    expect(matchCicloSearch(ciclo, null, "exv 14")).toBe(false);
  });
});