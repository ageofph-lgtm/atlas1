import { describe, it, expect, vi } from "vitest";
import { executarEmLote, resumirLote } from "@/components/atlas/executarEmLote";

const m = (serie, extra) => ({ id: serie, serie, ...extra });

describe("executarEmLote", () => {
  it("executa pela ordem e uma de cada vez — o Watcher não leva quinze ao mesmo tempo", async () => {
    const ordem = [];
    let emCurso = 0;
    let maxSimultaneas = 0;

    await executarEmLote([m("A"), m("B"), m("C")], {
      executar: async (x) => {
        emCurso += 1;
        maxSimultaneas = Math.max(maxSimultaneas, emCurso);
        // A primeira demora mais: se corressem em paralelo, a ordem trocava.
        await new Promise((r) => setTimeout(r, x.serie === "A" ? 20 : 1));
        ordem.push(x.serie);
        emCurso -= 1;
      },
    });

    expect(ordem).toEqual(["A", "B", "C"]);
    expect(maxSimultaneas).toBe(1);
  });

  it("uma falha a meio não impede as seguintes", async () => {
    const r = await executarEmLote([m("A"), m("B"), m("C")], {
      executar: async (x) => { if (x.serie === "B") throw new Error("Watcher recusou"); },
    });

    expect(r.feitas.map((x) => x.serie)).toEqual(["A", "C"]);
    expect(r.falhadas).toHaveLength(1);
    expect(r.falhadas[0].item.serie).toBe("B");
    expect(r.falhadas[0].erro).toBe("Watcher recusou");
  });

  it("o que não se aplica conta como ignorado, com motivo, e não é executado", async () => {
    const executar = vi.fn(async () => {});
    const r = await executarEmLote([m("A", { ok: true }), m("B", { ok: false })], {
      aplicavel: (x) => (x.ok ? true : "não estava classificada"),
      executar,
    });

    expect(executar).toHaveBeenCalledTimes(1);
    expect(r.feitas.map((x) => x.serie)).toEqual(["A"]);
    expect(r.ignoradas[0].motivo).toBe("não estava classificada");
  });

  it("um `false` seco também serve, com motivo genérico", async () => {
    const r = await executarEmLote([m("A")], { aplicavel: () => false, executar: async () => {} });
    expect(r.ignoradas[0].motivo).toBe("não se aplica");
  });

  it("sem `aplicavel`, tudo é executado", async () => {
    const r = await executarEmLote([m("A"), m("B")], { executar: async () => {} });
    expect(r.feitas).toHaveLength(2);
  });

  it("comunica o progresso a cada passo, e fecha no total", async () => {
    const passos = [];
    await executarEmLote([m("A"), m("B")], {
      executar: async () => {},
      onProgresso: ({ feito, total }) => passos.push(`${feito}/${total}`),
    });
    expect(passos).toEqual(["0/2", "1/2", "2/2"]);
  });

  it("lista vazia não faz nada e não se queixa", async () => {
    const executar = vi.fn();
    const r = await executarEmLote([], { executar });
    expect(executar).not.toHaveBeenCalled();
    expect(r).toEqual({ feitas: [], ignoradas: [], falhadas: [] });
    expect((await executarEmLote(undefined, { executar })).feitas).toEqual([]);
  });
});

describe("resumirLote", () => {
  it("diz as três coisas quando as três aconteceram", () => {
    const texto = resumirLote({
      feitas: [m("A"), m("B")],
      ignoradas: [{ item: m("C"), motivo: "não estava classificada" }],
      falhadas: [{ item: m("D"), erro: "recusou" }],
    }, "autorizada");

    expect(texto).toContain("2 autorizadas");
    expect(texto).toContain("1 ignorada (não estava classificada)");
    expect(texto).toContain("1 falhou (D)");
  });

  it("não inventa o que não houve", () => {
    expect(resumirLote({ feitas: [m("A")], ignoradas: [], falhadas: [] }, "autorizada"))
      .toBe("1 autorizada");
  });

  it("junta motivos repetidos em vez de os listar dez vezes", () => {
    const texto = resumirLote({
      feitas: [],
      ignoradas: [
        { item: m("A"), motivo: "já estava pronta" },
        { item: m("B"), motivo: "já estava pronta" },
      ],
      falhadas: [],
    });
    expect(texto).toBe("2 ignoradas (já estava pronta)");
  });

  it("com muitas falhas nomeia as primeiras e conta o resto", () => {
    const falhadas = ["A", "B", "C", "D"].map((s) => ({ item: m(s), erro: "x" }));
    expect(resumirLote({ feitas: [], ignoradas: [], falhadas })).toContain("(A, B e mais 2)");
  });

  it("um lote sem nada diz isso mesmo", () => {
    expect(resumirLote({ feitas: [], ignoradas: [], falhadas: [] })).toBe("Nada a fazer");
  });
});
