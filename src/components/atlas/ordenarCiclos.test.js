import { describe, it, expect } from "vitest";
import { ordenarCiclos, proximaOrdenacao, COLUNAS_ORDENAVEIS } from "@/components/atlas/ordenarCiclos";

const c = (id, extra) => ({ id, categoria: "str", estado: "pronta", ...extra });
const ordem = (lista) => lista.map((x) => x.id);

describe("ordenar por cone", () => {
  const lista = [c("a", { cone_numero: "10" }), c("b", { cone_numero: "9" }), c("c", { cone_numero: "2" })];

  it("compara como número — o 9 vem antes do 10, não depois", () => {
    expect(ordem(ordenarCiclos(lista, { coluna: "cone", direcao: "asc" }))).toEqual(["c", "b", "a"]);
  });

  it("inverte na direção descendente", () => {
    expect(ordem(ordenarCiclos(lista, { coluna: "cone", direcao: "desc" }))).toEqual(["a", "b", "c"]);
  });

  it("máquinas sem cone ficam no fim, nas duas direções", () => {
    const comVazio = [...lista, c("z", { cone_numero: null }), c("y", { cone_numero: "" })];
    expect(ordem(ordenarCiclos(comVazio, { coluna: "cone", direcao: "asc" })).slice(-2).sort()).toEqual(["y", "z"]);
    expect(ordem(ordenarCiclos(comVazio, { coluna: "cone", direcao: "desc" })).slice(-2).sort()).toEqual(["y", "z"]);
  });
});

describe("ordenar por texto", () => {
  it("respeita os acentos do português", () => {
    const lista = [c("a", { reserva_cliente: "Zebra" }), c("b", { reserva_cliente: "Águia" }), c("c", { reserva_cliente: "Bravo" })];
    expect(ordem(ordenarCiclos(lista, { coluna: "cliente", direcao: "asc" }))).toEqual(["b", "c", "a"]);
  });

  it("não liga a maiúsculas", () => {
    const lista = [c("a", { serie: "b-1" }), c("b", { serie: "A-1" })];
    expect(ordem(ordenarCiclos(lista, { coluna: "serie", direcao: "asc" }))).toEqual(["b", "a"]);
  });

  it("séries com números ordenam de forma natural", () => {
    const lista = [c("a", { serie: "NS-10" }), c("b", { serie: "NS-9" })];
    expect(ordem(ordenarCiclos(lista, { coluna: "serie", direcao: "asc" }))).toEqual(["b", "a"]);
  });

  it("clientes em branco vão para o fim mesmo em descendente", () => {
    const lista = [c("a", { reserva_cliente: "" }), c("b", { reserva_cliente: "Bravo" })];
    expect(ordem(ordenarCiclos(lista, { coluna: "cliente", direcao: "desc" }))).toEqual(["b", "a"]);
  });

  it("ordena pelo modelo, que vive na máquina e não no ciclo", () => {
    const lista = [c("a"), c("b")];
    const modelos = { a: { modelo: "RX 60-25" }, b: { modelo: "EXV 14" } };
    expect(ordem(ordenarCiclos(lista, { coluna: "modelo", direcao: "asc" }, (x) => modelos[x.id]))).toEqual(["b", "a"]);
  });

  it("ordena pelo rótulo do estado, o mesmo que se lê no ecrã", () => {
    const lista = [c("a", { estado: "pronta" }), c("b", { categoria: "sucata", estado: "classificada" })];
    // "Indefinido" antes de "Pronta"
    expect(ordem(ordenarCiclos(lista, { coluna: "estado", direcao: "asc" }))).toEqual(["b", "a"]);
  });
});

describe("ordenar por data", () => {
  const lista = [
    c("a", { data_entrada: "2026-09-10T08:00:00Z" }),
    c("b", { data_entrada: "2026-01-02T08:00:00Z" }),
    c("c", { data_entrada: null }),
  ];

  it("é cronológico, não alfabético", () => {
    expect(ordem(ordenarCiclos(lista, { coluna: "entrada", direcao: "asc" }))).toEqual(["b", "a", "c"]);
  });

  it("sem data fica no fim mesmo a descer", () => {
    expect(ordem(ordenarCiclos(lista, { coluna: "entrada", direcao: "desc" }))).toEqual(["a", "b", "c"]);
  });
});

describe("sem ordenação escolhida", () => {
  const lista = [c("a"), c("b"), c("c")];

  it("devolve a lista como veio — a ordem da página não se mexe sozinha", () => {
    expect(ordenarCiclos(lista, null)).toBe(lista);
    expect(ordenarCiclos(lista, { coluna: "inexistente", direcao: "asc" })).toBe(lista);
  });

  it("não modifica a lista original quando ordena", () => {
    const original = [c("a", { cone_numero: "2" }), c("b", { cone_numero: "1" })];
    ordenarCiclos(original, { coluna: "cone", direcao: "asc" });
    expect(ordem(original)).toEqual(["a", "b"]);
  });
});

describe("proximaOrdenacao", () => {
  it("clicar numa coluna nova começa ascendente", () => {
    expect(proximaOrdenacao(null, "serie")).toEqual({ coluna: "serie", direcao: "asc" });
    expect(proximaOrdenacao({ coluna: "cone", direcao: "desc" }, "serie")).toEqual({ coluna: "serie", direcao: "asc" });
  });

  it("clicar outra vez na mesma inverte, e à terceira volta ao princípio", () => {
    const a = proximaOrdenacao({ coluna: "serie", direcao: "asc" }, "serie");
    expect(a).toEqual({ coluna: "serie", direcao: "desc" });
    expect(proximaOrdenacao(a, "serie")).toEqual({ coluna: "serie", direcao: "asc" });
  });
});

describe("colunas ordenáveis", () => {
  it("cobrem as sete colunas do modo Detalhe", () => {
    expect(COLUNAS_ORDENAVEIS.map((c) => c.chave))
      .toEqual(["cone", "serie", "modelo", "categoria", "estado", "cliente", "entrada"]);
  });
});
