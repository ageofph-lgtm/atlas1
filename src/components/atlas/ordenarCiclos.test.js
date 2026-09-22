import { describe, it, expect } from "vitest";
import { ordenarCiclos, proximaOrdenacao, COLUNAS_ORDENAVEIS, CAMPOS_ORDENACAO } from "@/components/atlas/ordenarCiclos";

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

describe("campos que só existem no organizador", () => {
  it("a data de registo não é a data de entrada — uma máquina pode ser registada dias depois de chegar", () => {
    const lista = [
      c("a", { created_date: "2026-09-10T00:00:00Z", data_entrada: "2026-01-01T00:00:00Z" }),
      c("b", { created_date: "2026-09-01T00:00:00Z", data_entrada: "2026-09-20T00:00:00Z" }),
    ];
    expect(ordem(ordenarCiclos(lista, { coluna: "registo", direcao: "asc" }))).toEqual(["b", "a"]);
    // Pela entrada a ordem é outra — é por isso que são dois campos.
    expect(ordem(ordenarCiclos(lista, { coluna: "entrada", direcao: "asc" }))).toEqual(["a", "b"]);
  });

  it("ordena pela última alteração, que é o que se quer para ver o que mudou hoje", () => {
    const lista = [
      c("a", { updated_date: "2026-09-01T00:00:00Z" }),
      c("b", { updated_date: "2026-09-22T00:00:00Z" }),
      c("c", { updated_date: "2026-09-10T00:00:00Z" }),
    ];
    expect(ordem(ordenarCiclos(lista, { coluna: "alteracao", direcao: "desc" }))).toEqual(["b", "c", "a"]);
  });

  it("um registo nunca alterado usa a data de criação, em vez de cair para o fim", () => {
    const lista = [
      c("a", { created_date: "2026-09-20T00:00:00Z" }),
      c("b", { created_date: "2026-01-01T00:00:00Z", updated_date: "2026-09-21T00:00:00Z" }),
    ];
    expect(ordem(ordenarCiclos(lista, { coluna: "alteracao", direcao: "desc" }))).toEqual(["b", "a"]);
  });

  it("o ano da máquina vem da máquina, não do ciclo", () => {
    const anos = { a: { ano: 2018 }, b: { ano: 2024 }, c: { ano: 2020 } };
    const lista = [c("a"), c("b"), c("c")];
    const getMaquina = (x) => anos[x.id];
    expect(ordem(ordenarCiclos(lista, { coluna: "ano", direcao: "desc" }, getMaquina))).toEqual(["b", "c", "a"]);
  });

  it("uma máquina sem ano fica no fim, nas duas direções", () => {
    const anos = { a: { ano: 2018 }, b: {}, c: { ano: 2024 } };
    const lista = [c("a"), c("b"), c("c")];
    const getMaquina = (x) => anos[x.id];
    expect(ordem(ordenarCiclos(lista, { coluna: "ano", direcao: "asc" }, getMaquina)).at(-1)).toBe("b");
    expect(ordem(ordenarCiclos(lista, { coluna: "ano", direcao: "desc" }, getMaquina)).at(-1)).toBe("b");
  });

  it("ordena pela data em que ficou pronta — o capital parado há mais tempo primeiro", () => {
    const lista = [
      c("a", { data_pronta: "2026-09-20T00:00:00Z" }),
      c("b", { data_pronta: "2026-07-01T00:00:00Z" }),
      c("c", {}),
    ];
    expect(ordem(ordenarCiclos(lista, { coluna: "pronta", direcao: "asc" }))).toEqual(["b", "a", "c"]);
  });
});

describe("campos do organizador", () => {
  it("todos têm chave, rótulo e um tipo que se sabe comparar", () => {
    for (const campo of CAMPOS_ORDENACAO) {
      expect(campo.chave).toBeTruthy();
      expect(campo.label).toBeTruthy();
      expect(["numero", "texto", "data"]).toContain(campo.tipo);
      expect(typeof campo.valor).toBe("function");
    }
  });

  it("nenhuma chave repetida — duas opções iguais no organizador seriam indistinguíveis", () => {
    const chaves = CAMPOS_ORDENACAO.map((x) => x.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("as colunas do Detalhe são um subconjunto dos campos do organizador", () => {
    const chaves = new Set(CAMPOS_ORDENACAO.map((x) => x.chave));
    for (const col of COLUNAS_ORDENAVEIS) expect(chaves.has(col.chave)).toBe(true);
  });
});
