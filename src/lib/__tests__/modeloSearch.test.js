import { describe, it, expect } from "vitest";
import {
  analisarPesquisaDeModelo,
  capacidadeDoModelo,
  correspondenciaExata,
  correspondeAoModelo,
  ehPesquisaDeModelo,
  normalizarModelo,
  ordenarPorPesquisaDeModelo,
  textoNormalizado,
} from "@/lib/modeloSearch";
import { matchCicloSearch } from "@/components/atlas/searchUtils";

const encaixa = (modelo, query) => correspondeAoModelo(modelo, query);

/** Todos os modelos destes exemplos existem na frota (347 máquinas). */
const FAMILIA_EXV = ["EXV 14", "EXV 14C - i", "Exv 14i C", "EXV14C", "EXV 14 C", "EXV 14I"];
const FAMILIA_EXV_SF = ["EXV-SF 14", "EXV - SF 14", "EXV – SF 14I", "EXV-SF 14I"];

describe("normalizarModelo", () => {
  it("corta o modelo em tokens de letras e dígitos", () => {
    expect(normalizarModelo("exv 14")).toEqual(["exv", "14"]);
    expect(normalizarModelo("EXV 14C - i")).toEqual(["exv", "14", "ci"]);
    expect(normalizarModelo("Exv 14i C")).toEqual(["exv", "14", "ic"]);
    expect(normalizarModelo("exv-sf 16i")).toEqual(["exvsf", "16", "i"]);
    expect(normalizarModelo("fm-x 14")).toEqual(["fmx", "14"]);
    expect(normalizarModelo("EXU - S 22")).toEqual(["exus", "22"]);
    expect(normalizarModelo("opx25")).toEqual(["opx", "25"]);
  });

  it("tira acentos, espaços, traços, travessões, barras e pontos", () => {
    expect(normalizarModelo("EXV – SF 14I")).toEqual(["exvsf", "14", "i"]);
    expect(textoNormalizado("RX 60-50/600")).toBe("rx6050600");
    expect(normalizarModelo("  ")).toEqual([]);
    expect(normalizarModelo(undefined)).toEqual([]);
  });

  it("passa o sufixo SF/S para a frente do número (alias)", () => {
    expect(normalizarModelo("EXH20 SF")).toEqual(["exhsf", "20"]);
    expect(normalizarModelo("exh20sf")).toEqual(["exhsf", "20"]);
    expect(normalizarModelo("EXH-SF20")).toEqual(["exhsf", "20"]);
    expect(normalizarModelo("EXHSF20")).toEqual(["exhsf", "20"]);
    // A variante «S» sozinha também é família própria (EXH-S)
    expect(normalizarModelo("EXH-S20")).toEqual(["exhs", "20"]);
  });

  it("parte a série RX: «Rx2016» são a série 20 e a capacidade 16", () => {
    expect(normalizarModelo("Rx2016")).toEqual(["rx", "20", "16"]);
    expect(normalizarModelo("Rx20-16")).toEqual(["rx", "20", "16"]);
    expect(normalizarModelo("RX 20-16")).toEqual(["rx", "20", "16"]);
    expect(normalizarModelo("RX60-25")).toEqual(["rx", "60", "25"]);
    expect(normalizarModelo("RX 70-20 / 600")).toEqual(["rx", "70", "20", "600"]);
    // Famílias parecidas não são RX
    expect(normalizarModelo("RCE15 LI-ION")).toEqual(["rce", "15", "liion"]);
    expect(normalizarModelo("RXE 15")).toEqual(["rxe", "15"]);
  });
});

describe("reconhecer uma pesquisa de modelo", () => {
  it("uma pesquisa que começa por letras de família é de modelo", () => {
    ["exv", "exv 14", "exvsf14", "exv sf 14", "rx60", "rx60 25", "fm-x14", "exu s 22", "exh sf 20", "opx 25"].forEach(
      (q) => expect(ehPesquisaDeModelo(q), q).toBe(true)
    );
  });

  it("número, série e texto normal não passam por modelo", () => {
    ["60", "00397", "F20323X00524", "f20321", "triplex", "uts", "amarelo 7", "cone 12", "niho", "lítio"].forEach((q) =>
      expect(ehPesquisaDeModelo(q), q).toBe(false)
    );
  });

  it("«ex» — quem ainda está a escrever — já é pesquisa de modelo", () => {
    const analise = analisarPesquisaDeModelo("ex");
    expect(analise.familia).toBe("ex");
    expect(encaixa("EXV 14", "ex")).toBe(true);
    expect(encaixa("EXU-S 22", "ex")).toBe(true);
    expect(encaixa("RX20-16", "ex")).toBe(false);
  });
});

describe("exv 14 e as suas variantes", () => {
  it("encontra a EXV 14 em todas as formas de escrita", () => {
    FAMILIA_EXV.forEach((modelo) => expect(encaixa(modelo, "exv 14"), modelo).toBe(true));
  });

  it("não apanha a EXV SF, nem a 12, a 16 ou a 140", () => {
    FAMILIA_EXV_SF.forEach((modelo) => expect(encaixa(modelo, "exv 14"), modelo).toBe(false));
    ["EXV 12", "EXV 12 I", "EXV 16", "EXV 16I", "EXV 20", "EXV 10C", "EXV 140"].forEach((modelo) =>
      expect(encaixa(modelo, "exv 14"), modelo).toBe(false)
    );
  });

  it("as mesmas variantes com a série escrita junta", () => {
    FAMILIA_EXV.forEach((modelo) => expect(encaixa(modelo, "exv14"), modelo).toBe(true));
    expect(encaixa("EXV 10 BASIC", "exv 10")).toBe(true);
  });
});

describe("exv sf 14", () => {
  it("encontra a gama EXV SF, escrita de qualquer maneira", () => {
    FAMILIA_EXV_SF.forEach((modelo) => expect(encaixa(modelo, "exv sf 14"), modelo).toBe(true));
    FAMILIA_EXV_SF.forEach((modelo) => expect(encaixa(modelo, "exvsf14"), modelo).toBe(true));
  });

  it("não se mistura com a EXV 14", () => {
    FAMILIA_EXV.forEach((modelo) => expect(encaixa(modelo, "exv sf 14"), modelo).toBe(false));
  });
});

describe("letras de variante no fim", () => {
  it("«c» pede o C, «i» pede o I, em qualquer ordem", () => {
    expect(encaixa("EXV 14C - i", "exv 14 c")).toBe(true);
    expect(encaixa("Exv 14i C", "exv 14 c")).toBe(true);
    expect(encaixa("EXV 14I", "exv 14 c")).toBe(false);
    expect(encaixa("EXV 14I", "exv 14 i")).toBe(true);
    expect(encaixa("EXV 14C - i", "exv 14 i")).toBe(true);
    expect(encaixa("Exv 14i C", "exv 14 i")).toBe(true);
    expect(encaixa("EXV 14 C", "exv 14 i")).toBe(false);
    expect(encaixa("EXV 14C - i", "exv 14 ci")).toBe(true);
  });
});

describe("rx20, rx60, rx70", () => {
  it("rx60 apanha toda a gama 60 e mais nada", () => {
    ["RX60-25", "RX 60-25", "RX60-30", "RX60-30L", "RX60-35", "RX60-40", "RX60-50", "RX 60-50/600"].forEach((modelo) =>
      expect(encaixa(modelo, "rx60"), modelo).toBe(true)
    );
    ["RX20-16", "RX 20-16", "RX 70-20", "RXE 15", "RCE15 LI-ION"].forEach((modelo) =>
      expect(encaixa(modelo, "rx60"), modelo).toBe(false)
    );
  });

  it("rx60 25 é só a capacidade 25", () => {
    expect(encaixa("RX60-25", "rx60 25")).toBe(true);
    expect(encaixa("RX 60-25", "rx60 25")).toBe(true);
    expect(encaixa("RX60-30", "rx60 25")).toBe(false);
    expect(encaixa("RX 60-50/600", "rx60 25")).toBe(false);
  });

  it("rx20 16 apanha a 16 escrita de todas as formas e nunca a 18", () => {
    ["RX20-16", "RX20-16C", "RX20-16P", "RX 20-16", "Rx2016"].forEach((modelo) =>
      expect(encaixa(modelo, "rx20 16"), modelo).toBe(true)
    );
    ["RX20-18", "RX 20-18", "RX20-20L", "RX 20-14"].forEach((modelo) =>
      expect(encaixa(modelo, "rx20 16"), modelo).toBe(false)
    );
  });
});

describe("fm-x, exu s, exh sf, opx", () => {
  it("fm-x 14 encontra a FM-X 14", () => {
    expect(encaixa("FM-X 14", "fm-x14")).toBe(true);
    expect(encaixa("FM-X 14", "fmx 14")).toBe(true);
    expect(encaixa("FM-X 12", "fmx 14")).toBe(false);
    expect(encaixa("FM-4W25", "fmx 14")).toBe(false);
  });

  it("exu s 22 encontra a EXU-S 22 e não a EXU 18 nem a EXU-SF 20", () => {
    ["EXU-S 22", "EXU - S 22", "EXU – S 22"].forEach((modelo) => expect(encaixa(modelo, "exu s 22"), modelo).toBe(true));
    ["EXU 18", "Exu18", "EXU-SF 20", "EXU - SF 20", "EXU-S 24"].forEach((modelo) =>
      expect(encaixa(modelo, "exu s 22"), modelo).toBe(false)
    );
  });

  it("exh sf 20 encontra a EXH-SF20 nas três escritas e não a EXH-S20", () => {
    ["EXH-SF20", "EXHSF20", "EXH20 SF"].forEach((modelo) => expect(encaixa(modelo, "exh sf 20"), modelo).toBe(true));
    ["EXH-S20", "EXH-SF 25", "EXH-S25"].forEach((modelo) => expect(encaixa(modelo, "exh sf 20"), modelo).toBe(false));
  });

  it("opx 25 encontra a OPX 25 e a Opx25", () => {
    ["OPX 25", "Opx25"].forEach((modelo) => expect(encaixa(modelo, "opx 25"), modelo).toBe(true));
    ["OPX 20", "OPX 20 PLUS", "Opx L 12"].forEach((modelo) => expect(encaixa(modelo, "opx 25"), modelo).toBe(false));
  });
});

describe("na pesquisa das páginas", () => {
  const ciclo = { serie: "F20323X00524", cone_numero: "4", cone_cor: "azul" };
  const comModelo = (modelo) => [{ serie: "F20323X00524", modelo }];

  it("«exv 14» só devolve as EXV 14 — a palavra «exv» já não apanha o resto", () => {
    const modelos = ["EXV 14", "EXV 12", "EXV-SF 14", "EXV 16"];
    const encontrados = modelos.filter((modelo) =>
      matchCicloSearch(ciclo, { modelo }, "exv 14")
    );
    expect(encontrados).toEqual(["EXV 14"]);
    expect(comModelo("EXV 12").length).toBe(1);
  });

  it("a série, o cone e o cliente continuam a encontrar-se como antes", () => {
    expect(matchCicloSearch(ciclo, { modelo: "EXV 12" }, "f20323")).toBe(true);
    expect(matchCicloSearch(ciclo, { modelo: "EXV 12" }, "azul 4")).toBe(true);
    expect(matchCicloSearch({ ...ciclo, reserva_cliente: "Transportes Águia" }, { modelo: "EXV 12" }, "águia")).toBe(true);
    expect(matchCicloSearch(ciclo, { modelo: "EXV 12" }, "00397")).toBe(false);
  });

  it("uma máquina sem modelo não aparece numa pesquisa de modelo", () => {
    expect(matchCicloSearch(ciclo, null, "exv 14")).toBe(false);
  });
});

describe("ordem dos resultados", () => {
  it("a correspondência exata vem primeiro e o resto mantém a ordem", () => {
    const lista = [
      { id: "a", modelo: "EXV 14C - i" },
      { id: "b", modelo: "EXV 14" },
      { id: "c", modelo: "Exv 14i C" },
      { id: "d", modelo: "EXV 14 C" },
    ];
    const ordenada = ordenarPorPesquisaDeModelo(lista, "exv 14", (c) => ({ modelo: c.modelo }));
    expect(ordenada.map((c) => c.id)).toEqual(["b", "a", "c", "d"]);
    expect(correspondenciaExata("EXV 14", "exv 14")).toBe(true);
    expect(correspondenciaExata("EXV 14 C", "exv 14")).toBe(false);
  });

  it("sem pesquisa de modelo, a lista fica como estava", () => {
    const lista = [{ id: "a", modelo: "EXV 14" }, { id: "b", modelo: "EXV 12" }];
    expect(ordenarPorPesquisaDeModelo(lista, "14", (c) => ({ modelo: c.modelo }))).toBe(lista);
  });
});

describe("capacidade do modelo (sub-filtros de família)", () => {
  it("é o primeiro número, ou o segundo na gama RX", () => {
    expect(capacidadeDoModelo("EXV 14C - i")).toBe("14");
    expect(capacidadeDoModelo("EXV 10 BASIC")).toBe("10");
    expect(capacidadeDoModelo("RX20-16C")).toBe("16");
    expect(capacidadeDoModelo("Rx2016")).toBe("16");
    expect(capacidadeDoModelo("RX 60-50/600")).toBe("50");
    expect(capacidadeDoModelo("Opx L 12")).toBe("12");
  });

  it("sem número não há capacidade", () => {
    expect(capacidadeDoModelo("EXU")).toBe(null);
    expect(capacidadeDoModelo("")).toBe(null);
  });
});