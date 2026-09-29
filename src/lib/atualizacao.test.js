import { describe, it, expect, beforeEach } from "vitest";
import {
  INTERVALO_VERIFICACAO, estadoDaAtualizacao, subscreverAtualizacao,
  anunciarVersaoNova, aplicarVersaoNova, reporAtualizacao,
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
