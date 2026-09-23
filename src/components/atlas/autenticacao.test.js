import { describe, it, expect } from "vitest";
import { baseDaApp, urlDeLogin, urlDeLogout } from "@/components/atlas/autenticacao";

const ORIGEM = "https://atlas.base44.app";

describe("baseDaApp", () => {
  it("usa o parâmetro da plataforma quando existe", () => {
    expect(baseDaApp({ appBaseUrl: "https://app.base44.com" }, ORIGEM)).toBe("https://app.base44.com");
  });

  it("sem parâmetro cai na origem atual, em vez de produzir 'null/…'", () => {
    // O defeito que deixou a página em branco: `${null}/login` é uma string
    // com a palavra "null" lá dentro, não um erro que alguém veja.
    for (const p of [{}, { appBaseUrl: null }, { appBaseUrl: undefined }, { appBaseUrl: "" }]) {
      expect(baseDaApp(p, ORIGEM)).toBe(ORIGEM);
    }
  });

  it("nunca devolve nada com 'null' ou 'undefined' colado", () => {
    for (const p of [{}, { appBaseUrl: null }, { appBaseUrl: undefined }]) {
      const url = urlDeLogout(baseDaApp(p, ORIGEM), ORIGEM);
      expect(url).not.toMatch(/null|undefined/);
      expect(url.startsWith("https://")).toBe(true);
    }
  });

  it("uma barra a mais no fim não faz uma barra a dobrar", () => {
    expect(urlDeLogin(baseDaApp({ appBaseUrl: "https://app.base44.com/" }), "https://x/")).toContain("https://app.base44.com/login?");
  });

  it("sem parâmetro e sem origem devolve vazio, em vez de inventar", () => {
    expect(baseDaApp({}, "")).toBe("");
  });
});

describe("urlDeLogin", () => {
  it("leva o destino no from_url, codificado", () => {
    const url = urlDeLogin(ORIGEM, "https://atlas.base44.app/Inventario?a=1&b=2");
    expect(url.startsWith(`${ORIGEM}/login?from_url=`)).toBe(true);
    // O & do destino não pode partir a query da própria URL de login.
    expect(url.split("from_url=")[1]).not.toContain("&");
    expect(decodeURIComponent(url.split("from_url=")[1])).toBe("https://atlas.base44.app/Inventario?a=1&b=2");
  });
});

describe("urlDeLogout", () => {
  it("termina a sessão e volta para o login, não para a aplicação", () => {
    // Voltar à aplicação sem sessão faz a plataforma reencaminhar outra vez;
    // se esse salto falhar, fica-se num ecrã vazio sem saída.
    const url = urlDeLogout(ORIGEM, `${ORIGEM}/Inventario`);
    expect(url.startsWith(`${ORIGEM}/api/apps/auth/logout?from_url=`)).toBe(true);
    const destino = decodeURIComponent(url.split("from_url=")[1]);
    expect(destino.startsWith(`${ORIGEM}/login?from_url=`)).toBe(true);
    expect(decodeURIComponent(destino.split("from_url=")[1])).toBe(`${ORIGEM}/Inventario`);
  });
});
