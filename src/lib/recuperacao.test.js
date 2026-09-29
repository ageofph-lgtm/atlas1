import { describe, it, expect, beforeEach } from "vitest";
import {
  CHAVE_TENTATIVA, podeTentarRecuperar, marcarTentativa, limparTentativa,
  limparAplicacaoEmCache, recuperarERecarregar, eErroDeVersaoPresa,
} from "@/lib/recuperacao";

const memoria = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
};

const armazenamentoQueFalha = () => ({
  getItem: () => { throw new Error("bloqueado"); },
  setItem: () => { throw new Error("bloqueado"); },
  removeItem: () => { throw new Error("bloqueado"); },
});

describe("a marca de tentativa", () => {
  let arm;
  beforeEach(() => { arm = memoria(); });

  it("à primeira pode tentar", () => {
    expect(podeTentarRecuperar(arm)).toBe(true);
  });

  it("depois de marcada, não tenta outra vez", () => {
    marcarTentativa(arm);
    expect(podeTentarRecuperar(arm)).toBe(false);
  });

  it("limpar a marca volta a permitir", () => {
    marcarTentativa(arm);
    limparTentativa(arm);
    expect(podeTentarRecuperar(arm)).toBe(true);
  });

  it("com o armazenamento bloqueado NÃO tenta — um ciclo de recargas é pior", () => {
    // Numa janela privada ou com armazenamento desligado não há como saber se
    // já se tentou. Recarregar às cegas daria um ciclo infinito.
    expect(podeTentarRecuperar(armazenamentoQueFalha())).toBe(false);
    expect(podeTentarRecuperar(null)).toBe(false);
    expect(podeTentarRecuperar(undefined)).toBe(false);
  });

  it("marcar e limpar não rebentam com o armazenamento bloqueado", () => {
    expect(() => marcarTentativa(armazenamentoQueFalha())).not.toThrow();
    expect(() => limparTentativa(armazenamentoQueFalha())).not.toThrow();
    expect(() => marcarTentativa(null)).not.toThrow();
  });

  it("usa uma chave própria, que não colide com a sessão", () => {
    expect(CHAVE_TENTATIVA).toBe("atlas:recuperacao");
    expect(CHAVE_TENTATIVA).not.toBe("atlas:sessao");
  });
});

describe("limparAplicacaoEmCache", () => {
  const swCom = (n) => {
    const registos = Array.from({ length: n }, () => ({ unregister: async () => true }));
    return { getRegistrations: async () => registos };
  };
  const cachesCom = (nomes) => ({ keys: async () => [...nomes], delete: async () => true });

  it("deita fora os service workers e as caches", async () => {
    const r = await limparAplicacaoEmCache({ serviceWorker: swCom(2), caches: cachesCom(["a", "b", "c"]) });
    expect(r).toEqual({ workers: 2, caches: 3 });
  });

  it("os dois caem juntos — só um deles deixava a versão velha a voltar", async () => {
    // Desregistar o worker sem apagar a cache faz a visita seguinte servir
    // exatamente os mesmos ficheiros velhos.
    const apagadas = [];
    const caches = { keys: async () => ["v1", "v2"], delete: async (n) => { apagadas.push(n); return true; } };
    await limparAplicacaoEmCache({ serviceWorker: swCom(1), caches });
    expect(apagadas).toEqual(["v1", "v2"]);
  });

  it("um browser sem service worker não rebenta", async () => {
    const r = await limparAplicacaoEmCache({ serviceWorker: undefined, caches: cachesCom(["a"]) });
    expect(r).toEqual({ workers: 0, caches: 1 });
  });

  it("um browser sem caches não rebenta", async () => {
    const r = await limparAplicacaoEmCache({ serviceWorker: swCom(1), caches: undefined });
    expect(r).toEqual({ workers: 1, caches: 0 });
  });

  it("se o desregisto falhar, ainda assim apaga as caches", async () => {
    const sw = { getRegistrations: async () => { throw new Error("negado"); } };
    const r = await limparAplicacaoEmCache({ serviceWorker: sw, caches: cachesCom(["a"]) });
    expect(r.caches).toBe(1);
  });

  it("sem nada não rebenta", async () => {
    expect(await limparAplicacaoEmCache()).toEqual({ workers: 0, caches: 0 });
    expect(await limparAplicacaoEmCache({})).toEqual({ workers: 0, caches: 0 });
  });
});

describe("recuperarERecarregar", () => {
  const deps = (arm) => {
    const chamadas = { recarregou: 0 };
    return {
      chamadas,
      opcoes: {
        serviceWorker: { getRegistrations: async () => [] },
        caches: { keys: async () => [], delete: async () => true },
        armazenamento: arm,
        recarregar: () => { chamadas.recarregou += 1; },
      },
    };
  };

  it("limpa e recarrega à primeira", async () => {
    const { chamadas, opcoes } = deps(memoria());
    expect(await recuperarERecarregar(opcoes)).toBe(true);
    expect(chamadas.recarregou).toBe(1);
  });

  it("à segunda não faz nada — é o que impede o ciclo de recargas", async () => {
    const arm = memoria();
    const a = deps(arm);
    await recuperarERecarregar(a.opcoes);
    const b = deps(arm);
    expect(await recuperarERecarregar(b.opcoes)).toBe(false);
    expect(b.chamadas.recarregou).toBe(0);
  });

  it("com o armazenamento bloqueado não recarrega", async () => {
    const { chamadas, opcoes } = deps(armazenamentoQueFalha());
    expect(await recuperarERecarregar(opcoes)).toBe(false);
    expect(chamadas.recarregou).toBe(0);
  });
});

describe("eErroDeVersaoPresa", () => {
  it("reconhece as falhas de carregar um pedaço de código que já não existe", () => {
    // Cada browser escreve isto à sua maneira; são todos o mesmo sintoma.
    const reais = [
      new TypeError("Failed to fetch dynamically imported module: https://a/assets/index-ABC.js"),
      new Error("error loading dynamically imported module"),
      new Error("Importing a module script failed."),
      new Error("Unable to preload CSS for /assets/x.css"),
      Object.assign(new Error("Loading chunk 42 failed"), { name: "ChunkLoadError" }),
    ];
    for (const e of reais) expect(eErroDeVersaoPresa(e), e.message).toBe(true);
  });

  it("aceita também uma string, que é como alguns eventos a entregam", () => {
    expect(eErroDeVersaoPresa("Failed to fetch dynamically imported module")).toBe(true);
  });

  it("não confunde com erros normais da aplicação", () => {
    // Limpar a cache e recarregar por causa de um erro qualquer seria esconder
    // defeitos reais atrás de uma recarga.
    for (const e of [
      new Error("Cannot read properties of undefined"),
      new Error("Network request failed"),
      new Error("Request failed with status code 403"),
      new TypeError("x is not a function"),
    ]) {
      expect(eErroDeVersaoPresa(e), e.message).toBe(false);
    }
  });

  it("nada, vazio ou lixo não conta como erro de versão", () => {
    for (const e of [null, undefined, "", "   ", {}, 0]) {
      expect(eErroDeVersaoPresa(e), JSON.stringify(e)).toBe(false);
    }
  });
});
