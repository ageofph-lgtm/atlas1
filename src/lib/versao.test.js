import { describe, it, expect } from "vitest";
import {
  entradaDoHtml, entradaDoDocumento, versaoMudou, enderecoSemCache, podeAtualizarSozinho,
  marcarAtualizacaoAutomatica, esquecerSeJaChegou, decidir, vigiarVersao, CHAVE_AUTOMATICA, JANELA_AUTOMATICA,
  INTERVALO_VERSAO,
} from "@/lib/versao";

const html = (src) => `<!doctype html><html><head>
  <script>(function(){ /* tema */ })();</script>
  <script type="module" crossorigin src="${src}"></script>
  <link rel="stylesheet" crossorigin href="/assets/index-abc.css">
</head><body><div id="root"></div></body></html>`;

const armazenamentoFalso = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

describe("entradaDoHtml", () => {
  it("lê o ficheiro de arranque que o index.html publicado pede", () => {
    expect(entradaDoHtml(html("/assets/index-CPsUtGh9.js"))).toBe("/assets/index-CPsUtGh9.js");
  });

  it("aceita os atributos por outra ordem e o endereço completo", () => {
    expect(entradaDoHtml('<script src="https://x.base44.app/assets/index-1.js" type="module"></script>')).toBe("/assets/index-1.js");
  });

  it("ignora scripts inline e módulos de fora de /assets/", () => {
    expect(entradaDoHtml('<script>1</script><script type="module" src="/src/main.jsx"></script>')).toBe(null);
  });

  it("sem HTML, ou HTML que não é o da aplicação, não inventa", () => {
    expect(entradaDoHtml(null)).toBe(null);
    expect(entradaDoHtml("<h1>404</h1>")).toBe(null);
  });
});

describe("entradaDoDocumento", () => {
  it("lê o script módulo de /assets/ da página aberta", () => {
    const doc = { querySelectorAll: () => [{ getAttribute: () => "/assets/index-CnggabMT.js" }] };
    expect(entradaDoDocumento(doc)).toBe("/assets/index-CnggabMT.js");
  });

  it("em desenvolvimento (sem /assets/) não há versão a comparar", () => {
    expect(entradaDoDocumento({ querySelectorAll: () => [{ getAttribute: () => "/src/main.jsx" }] })).toBe(null);
    expect(entradaDoDocumento(null)).toBe(null);
  });
});

describe("versaoMudou", () => {
  it("só quando se sabem as duas e são diferentes", () => {
    expect(versaoMudou("/assets/index-a.js", "/assets/index-b.js")).toBe(true);
    expect(versaoMudou("/assets/index-a.js", "/assets/index-a.js")).toBe(false);
    expect(versaoMudou(null, "/assets/index-b.js")).toBe(false);
    expect(versaoMudou("/assets/index-a.js", null)).toBe(false);
  });
});

describe("enderecoSemCache", () => {
  it("mantém o caminho, os parâmetros e o fim, e junta o marcador", () => {
    expect(enderecoSemCache("https://x.app/Inventario?aba=pronta#topo", 123)).toBe("/Inventario?aba=pronta&_v=123#topo");
  });

  it("troca um marcador antigo em vez de os acumular", () => {
    expect(enderecoSemCache("https://x.app/?_v=1", 2)).toBe("/?_v=2");
  });
});

describe("atualizar sozinho — nunca em ciclo", () => {
  it("a primeira vez para uma versão pode", () => {
    expect(podeAtualizarSozinho(armazenamentoFalso(), "/assets/index-b.js")).toBe(true);
  });

  it("depois de tentar para essa versão, não volta a tentar nos 10 minutos seguintes", () => {
    const a = armazenamentoFalso();
    marcarAtualizacaoAutomatica(a, "/assets/index-b.js", 1000);
    expect(podeAtualizarSozinho(a, "/assets/index-b.js", 1000 + 60000)).toBe(false);
    expect(podeAtualizarSozinho(a, "/assets/index-b.js", 1000 + JANELA_AUTOMATICA)).toBe(true);
  });

  it("uma versão ainda mais nova pode tentar logo", () => {
    const a = armazenamentoFalso();
    marcarAtualizacaoAutomatica(a, "/assets/index-b.js", 1000);
    expect(podeAtualizarSozinho(a, "/assets/index-c.js", 2000)).toBe(true);
  });

  it("quando a atualização resultou, a marca sai — e a próxima versão velha volta a atualizar-se sozinha", () => {
    // Medido: atualizou-se em /Inventario; noutro dia o browser trouxe a versão
    // velha guardada em /. Com a marca ainda lá, só avisava em vez de atualizar.
    const a = armazenamentoFalso();
    marcarAtualizacaoAutomatica(a, "/assets/index-b.js", 1000);
    esquecerSeJaChegou(a, "/assets/index-b.js");
    expect(podeAtualizarSozinho(a, "/assets/index-b.js", 2000)).toBe(true);
  });

  it("se a página continua na versão velha, a marca fica — é o que trava o ciclo", () => {
    const a = armazenamentoFalso();
    marcarAtualizacaoAutomatica(a, "/assets/index-b.js", 1000);
    esquecerSeJaChegou(a, "/assets/index-a.js");
    expect(podeAtualizarSozinho(a, "/assets/index-b.js", 2000)).toBe(false);
  });

  it("sem armazenamento, ou com lixo lá dentro, não tenta — um ciclo é pior do que um aviso", () => {
    expect(podeAtualizarSozinho(null, "/assets/index-b.js")).toBe(false);
    const a = armazenamentoFalso();
    a.setItem(CHAVE_AUTOMATICA, "{nao-e-json");
    expect(podeAtualizarSozinho(a, "/assets/index-b.js")).toBe(false);
  });
});

describe("decidir", () => {
  it("no arranque, sem ninguém ter mexido, atualiza sozinho", () => {
    expect(decidir({ noArranque: true, interagiu: false, podeSozinho: true })).toBe("atualizar");
  });

  it("depois de começar a trabalhar, só avisa", () => {
    expect(decidir({ noArranque: true, interagiu: true, podeSozinho: true })).toBe("avisar");
    expect(decidir({ noArranque: false, interagiu: false, podeSozinho: true })).toBe("avisar");
  });

  it("se já tentou sozinho para esta versão, avisa", () => {
    expect(decidir({ noArranque: true, interagiu: false, podeSozinho: false })).toBe("avisar");
  });
});

describe("vigiarVersao", () => {
  const montar = ({ respostas, visivel = "visible" } = {}) => {
    const ouvintes = {};
    const alvo = (nome) => ({ addEventListener: (ev, fn) => { ouvintes[`${nome}:${ev}`] = fn; } });
    const documento = { ...alvo("doc"), visibilityState: visivel };
    const janela = alvo("janela");
    let tique = null;
    let relogio = 0;
    const detetados = [];
    let pedidos = 0;
    const fila = [...respostas];
    const vigia = vigiarVersao({
      consultar: async () => { pedidos += 1; const r = fila.shift(); if (r instanceof Error) throw r; return r; },
      entradaAtual: "/assets/index-a.js",
      aoDetetar: (d) => detetados.push(d),
      documento, janela,
      agendar: (fn) => { tique = fn; },
      agora: () => relogio,
    });
    return {
      vigia, documento, detetados, ouvintes,
      pedidos: () => pedidos,
      tique: async () => { tique(); await Promise.resolve(); await Promise.resolve(); },
      avancar: (ms) => { relogio += ms; },
      disparar: async (chave) => { ouvintes[chave](); await Promise.resolve(); await Promise.resolve(); },
    };
  };
  const pausa = () => new Promise((r) => setTimeout(r, 0));

  it("verifica logo no arranque e marca que foi no arranque", async () => {
    const v = montar({ respostas: ["/assets/index-b.js"] });
    await pausa();
    expect(v.detetados).toEqual([{ publicada: "/assets/index-b.js", noArranque: true }]);
  });

  it("durante o uso, o tique periódico apanha a versão nova", async () => {
    const v = montar({ respostas: ["/assets/index-a.js", "/assets/index-b.js"] });
    await pausa();
    expect(v.detetados).toEqual([]);
    await v.tique(); await pausa();
    expect(v.detetados).toEqual([{ publicada: "/assets/index-b.js", noArranque: false }]);
  });

  it("ao voltar à aplicação verifica, mas não mais do que uma vez a cada 30 s", async () => {
    const v = montar({ respostas: ["/assets/index-a.js", "/assets/index-b.js", "/assets/index-b.js"] });
    await pausa();
    await v.disparar("doc:visibilitychange"); await pausa();
    expect(v.pedidos()).toBe(1);
    v.avancar(31000);
    await v.disparar("janela:focus"); await pausa();
    expect(v.pedidos()).toBe(2);
    expect(v.detetados).toHaveLength(1);
  });

  it("com o separador escondido não gasta pedidos", async () => {
    const v = montar({ respostas: ["/assets/index-a.js"], visivel: "hidden" });
    await pausa();
    await v.tique(); await pausa();
    expect(v.pedidos()).toBe(1);
  });

  it("sem rede não rebenta nem avisa", async () => {
    const v = montar({ respostas: [new Error("offline"), null] });
    await pausa();
    await v.tique(); await pausa();
    expect(v.detetados).toEqual([]);
  });

  it("verifica de 2 em 2 minutos", () => {
    expect(INTERVALO_VERSAO).toBe(120000);
  });
});
