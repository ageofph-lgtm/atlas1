import { describe, it, expect, beforeEach } from "vitest";
import {
  INTERVALO_VERIFICACAO, estadoDaAtualizacao, subscreverAtualizacao,
  anunciarVersaoNova, aplicarVersaoNova, reporAtualizacao,
  criarTrocaDeVersao, ESPERA_TROCA,
} from "@/lib/atualizacao";

beforeEach(() => reporAtualizacao());

describe("estado da atualização", () => {
  it("começa sem nada por aplicar", () => {
    expect(estadoDaAtualizacao()).toEqual({ disponivel: false, aplicar: null });
  });

  it("anunciar uma versão nova torna-a disponível", () => {
    expect(anunciarVersaoNova(() => {})).toBe(true);
    expect(estadoDaAtualizacao().disponivel).toBe(true);
  });

  it("anunciar sem função de aplicar não faz nada", () => {
    // Um aviso sem forma de o resolver seria um botão que não faz nada.
    for (const mau of [null, undefined, "reload", 42, {}]) {
      expect(anunciarVersaoNova(mau), String(mau)).toBe(false);
      expect(estadoDaAtualizacao().disponivel).toBe(false);
    }
  });
});

describe("quem ouve", () => {
  it("é avisado quando há versão nova", () => {
    const vistos = [];
    subscreverAtualizacao((e) => vistos.push(e.disponivel));
    anunciarVersaoNova(() => {});
    expect(vistos).toEqual([true]);
  });

  it("deixa de ser avisado depois de cancelar", () => {
    const vistos = [];
    const cancelar = subscreverAtualizacao((e) => vistos.push(e.disponivel));
    cancelar();
    anunciarVersaoNova(() => {});
    expect(vistos).toEqual([]);
  });

  it("um ouvinte que rebenta não impede os outros de saber", () => {
    const vistos = [];
    subscreverAtualizacao(() => { throw new Error("rebentou"); });
    subscreverAtualizacao(() => vistos.push("ok"));
    expect(() => anunciarVersaoNova(() => {})).not.toThrow();
    expect(vistos).toEqual(["ok"]);
  });

  it("vários ouvintes recebem todos", () => {
    let n = 0;
    subscreverAtualizacao(() => { n += 1; });
    subscreverAtualizacao(() => { n += 1; });
    anunciarVersaoNova(() => {});
    expect(n).toBe(2);
  });
});

describe("aplicar", () => {
  it("chama a função que troca de versão", () => {
    let aplicou = 0;
    anunciarVersaoNova(() => { aplicou += 1; });
    expect(aplicarVersaoNova()).toBe(true);
    expect(aplicou).toBe(1);
  });

  it("dois cliques seguidos só trocam uma vez", () => {
    // O botão desaparece ao primeiro clique, mas um duplo-clique rápido chega
    // aos dois antes de o ecrã desenhar.
    let aplicou = 0;
    anunciarVersaoNova(() => { aplicou += 1; });
    aplicarVersaoNova();
    expect(aplicarVersaoNova()).toBe(false);
    expect(aplicou).toBe(1);
  });

  it("sem versão nova não faz nada", () => {
    expect(aplicarVersaoNova()).toBe(false);
  });

  it("avisa os ouvintes de que o aviso já não está de pé", () => {
    const vistos = [];
    subscreverAtualizacao((e) => vistos.push(e.disponivel));
    anunciarVersaoNova(() => {});
    aplicarVersaoNova();
    expect(vistos).toEqual([true, false]);
  });

  it("nunca aplica sozinho — só quando alguém chama", () => {
    // Uma recarga automática a meio de um registo perde o que já foi escrito.
    let aplicou = false;
    anunciarVersaoNova(() => { aplicou = true; });
    expect(aplicou).toBe(false);
  });
});

describe("o intervalo de verificação", () => {
  it("é de meia hora — o browser só procura sozinho ao carregar a página", () => {
    expect(INTERVALO_VERIFICACAO).toBe(1800000);
  });
});

describe("criarTrocaDeVersao — o que o botão faz", () => {
  /** Um `navigator.serviceWorker` de mentira: guarda os ouvintes para os disparar à mão. */
  const contentorFalso = () => {
    const ouvintes = [];
    return {
      addEventListener: (nome, fn) => ouvintes.push({ nome, fn }),
      disparar: (nome) => ouvintes.filter((o) => o.nome === nome).forEach((o) => o.fn()),
    };
  };
  /** Temporizadores que só correm quando se manda. */
  const relogio = () => {
    const pendentes = [];
    return { esperar: (fn) => pendentes.push(fn), avancar: () => pendentes.splice(0).forEach((fn) => fn()) };
  };

  it("sem worker à espera recarrega logo, uma vez", async () => {
    let recargas = 0;
    const pedidos = [];
    const { trocar } = criarTrocaDeVersao({
      obterAEspera: async () => null,
      pedirTroca: () => pedidos.push("troca"),
      recarregar: () => { recargas += 1; },
    });
    await trocar();
    expect(recargas).toBe(1);
    expect(pedidos).toEqual([]);
  });

  it("com worker à espera, pede a troca e só recarrega quando ele assume", async () => {
    // O defeito medido: recarregar sem pedir a troca deixava o worker novo à
    // espera para sempre, e a barra voltava a cada arranque.
    let recargas = 0;
    const contentor = contentorFalso();
    const r = relogio();
    let pediu = 0;
    const { trocar } = criarTrocaDeVersao({
      obterAEspera: async () => ({ state: "installed" }),
      pedirTroca: () => { pediu += 1; },
      recarregar: () => { recargas += 1; },
      contentor,
      esperar: r.esperar,
    });
    await trocar();
    expect(pediu).toBe(1);
    expect(recargas).toBe(0);
    contentor.disparar("controllerchange");
    expect(recargas).toBe(1);
  });

  it("o ciclo de recargas é impossível: troca, evento e temporizador dão uma recarga só", async () => {
    // Foi o que já deu 94 recargas: duas vias a recarregar sem guarda.
    let recargas = 0;
    const contentor = contentorFalso();
    const r = relogio();
    const { trocar, recarregarUmaVez } = criarTrocaDeVersao({
      obterAEspera: async () => ({}),
      pedirTroca: () => {},
      recarregar: () => { recargas += 1; },
      contentor,
      esperar: r.esperar,
    });
    await trocar();
    contentor.disparar("controllerchange");
    contentor.disparar("controllerchange");
    r.avancar();
    recarregarUmaVez(); // a via do próprio registo do worker (onNeedReload)
    expect(recargas).toBe(1);
  });

  it("se o worker nunca assumir, o temporizador recarrega na mesma", async () => {
    let recargas = 0;
    const r = relogio();
    const { trocar } = criarTrocaDeVersao({
      obterAEspera: async () => ({}),
      pedirTroca: () => {},
      recarregar: () => { recargas += 1; },
      contentor: contentorFalso(),
      esperar: r.esperar,
    });
    await trocar();
    expect(recargas).toBe(0);
    r.avancar();
    expect(recargas).toBe(1);
  });

  it("um erro a perguntar pelo worker ou a pedir a troca não deixa o botão sem efeito", async () => {
    let recargas = 0;
    const r = relogio();
    await criarTrocaDeVersao({
      obterAEspera: async () => { throw new Error("sem permissão"); },
      recarregar: () => { recargas += 1; },
    }).trocar();
    expect(recargas).toBe(1);

    await criarTrocaDeVersao({
      obterAEspera: async () => ({}),
      pedirTroca: async () => { throw new Error("worker morreu"); },
      recarregar: () => { recargas += 1; },
      contentor: contentorFalso(),
      esperar: r.esperar,
    }).trocar();
    r.avancar();
    expect(recargas).toBe(2);
  });

  it("outro separador que troque de versão não recarrega este a meio de um registo", async () => {
    let recargas = 0;
    const { recarregarSePedida } = criarTrocaDeVersao({
      obterAEspera: async () => ({}),
      pedirTroca: () => {},
      recarregar: () => { recargas += 1; },
    });
    // O worker novo assumiu por causa do botão noutro separador.
    expect(recarregarSePedida()).toBe(false);
    expect(recargas).toBe(0);
  });

  it("o separador que pediu a troca recarrega quando o registo avisa", async () => {
    let recargas = 0;
    const r = relogio();
    const { trocar, recarregarSePedida } = criarTrocaDeVersao({
      obterAEspera: async () => ({}),
      pedirTroca: () => {},
      recarregar: () => { recargas += 1; },
      contentor: contentorFalso(),
      esperar: r.esperar,
    });
    await trocar();
    expect(recarregarSePedida()).toBe(true);
    r.avancar();
    expect(recargas).toBe(1);
  });

  it("espera uns segundos, não minutos", () => {
    expect(ESPERA_TROCA).toBeGreaterThanOrEqual(1000);
    expect(ESPERA_TROCA).toBeLessThanOrEqual(10000);
  });
});
