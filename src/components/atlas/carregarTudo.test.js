import { describe, it, expect, vi } from "vitest";
import { listarTudo } from "@/components/atlas/carregarTudo";

/** Entidade falsa com `n` registos, que respeita limite e salto como o SDK. */
const entidadeCom = (n) => {
  const linhas = Array.from({ length: n }, (_, i) => ({ id: `r${i}` }));
  return {
    linhas,
    list: vi.fn(async (_sort, limite, salto = 0) => linhas.slice(salto, salto + limite)),
  };
};

describe("listarTudo", () => {
  it("traz tudo quando cabe numa página", async () => {
    const e = entidadeCom(120);
    const r = await listarTudo(e, { pagina: 500 });
    expect(r.registos).toHaveLength(120);
    expect(r.truncado).toBe(false);
    expect(e.list).toHaveBeenCalledTimes(1);
  });

  it("vai buscar as páginas seguintes em vez de ficar pelos primeiros 500", async () => {
    // O caso que a aplicação ia ter: 1240 ciclos e só 500 a aparecer.
    const e = entidadeCom(1240);
    const r = await listarTudo(e, { pagina: 500 });
    expect(r.registos).toHaveLength(1240);
    expect(e.list).toHaveBeenCalledTimes(3);
    expect(r.truncado).toBe(false);
  });

  it("não repete nem salta registos entre páginas", async () => {
    const e = entidadeCom(1240);
    const { registos } = await listarTudo(e, { pagina: 500 });
    expect(new Set(registos.map((x) => x.id)).size).toBe(1240);
    expect(registos[0].id).toBe("r0");
    expect(registos[1239].id).toBe("r1239");
  });

  it("um total exatamente múltiplo da página faz um pedido a mais e pára", async () => {
    const e = entidadeCom(1000);
    const r = await listarTudo(e, { pagina: 500 });
    expect(r.registos).toHaveLength(1000);
    expect(e.list).toHaveBeenCalledTimes(3); // 500, 500, 0
  });

  it("ao bater no travão avisa — e é isso que impede o limite calado", async () => {
    const e = entidadeCom(20000);
    const r = await listarTudo(e, { pagina: 500, maximo: 1000 });
    expect(r.truncado).toBe(true);
    expect(r.registos).toHaveLength(1000);
    expect(r.total).toBe(1000);
  });

  it("entidade vazia devolve lista vazia sem se queixar", async () => {
    const r = await listarTudo(entidadeCom(0), { pagina: 500 });
    expect(r.registos).toEqual([]);
    expect(r.truncado).toBe(false);
  });

  it("deixa o erro subir — falhar a ler não pode passar por lista vazia", async () => {
    const e = { list: vi.fn(async () => { throw new Error("sem rede"); }) };
    await expect(listarTudo(e)).rejects.toThrow("sem rede");
  });
});
