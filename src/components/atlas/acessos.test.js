import { describe, it, expect } from "vitest";
import {
  ACESSOS, PERFIS, acessoDe, temAcesso, perfisDe, perfilPadrao,
  podeTrocarPerfil, perfilEfetivo, nomeDe, normalizarEmail,
} from "@/components/atlas/acessos";

describe("quem está na lista", () => {
  it("cada um dos oito entra com o perfil que lhe foi dado", () => {
    const esperado = {
      "carlos.goncalves@still.pt": "comercial",
      "nuno.lopes@still.pt": "comercial",
      "joao.neves@still.pt": "comercial",
      "pedro.borges@still.pt": "comercial",
      "angelo.correia@kiongroup.com": "gestor_frota",
      "catarina.goncalves@still.pt": "gestor_frota",
      "luis.sousa@still.pt": "logistica",
      "raphael.toledo@still.pt": "administrador",
    };
    for (const [email, perfil] of Object.entries(esperado)) {
      expect(temAcesso(email), email).toBe(true);
      expect(perfilPadrao(email), email).toBe(perfil);
    }
    expect(ACESSOS).toHaveLength(Object.keys(esperado).length);
  });

  it("quem não está na lista não entra — é o ponto todo", () => {
    for (const email of ["intruso@gmail.com", "carlos.goncalves@gmail.com", "still.pt", ""]) {
      expect(temAcesso(email), email).toBe(false);
      expect(perfilPadrao(email), email).toBe(null);
      expect(perfisDe(email), email).toEqual([]);
    }
  });

  it("um email vazio, nulo ou indefinido nunca dá acesso", () => {
    for (const v of [null, undefined, "", "   "]) {
      expect(temAcesso(v)).toBe(false);
      expect(acessoDe(v)).toBe(null);
    }
  });

  it("um domínio parecido não serve — só o email exato", () => {
    // O kiongroup.com está na lista, mas isso não abre o still.com nem
    // sufixos que apenas terminam igual.
    expect(temAcesso("luis.sousa@still.com")).toBe(false);
    expect(temAcesso("xluis.sousa@still.pt")).toBe(false);
    expect(temAcesso("luis.sousa@still.pt.evil.com")).toBe(false);
  });
});

describe("normalização do email", () => {
  it("maiúsculas e espaços não impedem ninguém de entrar", () => {
    expect(temAcesso("  Carlos.Goncalves@STILL.pt ")).toBe(true);
    expect(perfilPadrao("CATARINA.GONCALVES@still.PT")).toBe("gestor_frota");
  });

  it("normalizarEmail aguenta o que não é texto", () => {
    expect(normalizarEmail(null)).toBe("");
    expect(normalizarEmail(undefined)).toBe("");
    expect(normalizarEmail(123)).toBe("123");
  });

  it("a própria lista está escrita em minúsculas, para não haver duas verdades", () => {
    for (const a of ACESSOS) expect(a.email).toBe(a.email.toLowerCase());
  });
});

describe("o perfil não é escolhido por quem entra", () => {
  it("pedir um perfil que a lista não dá devolve o da lista, não o pedido", () => {
    // Era assim que o ecrã antigo funcionava: escolhia-se "administrador" e
    // ficava gravado. Agora a lista ganha sempre.
    expect(perfilEfetivo("carlos.goncalves@still.pt", "administrador")).toBe("comercial");
    expect(perfilEfetivo("luis.sousa@still.pt", "gestor_frota")).toBe("logistica");
  });

  it("um perfil inventado não passa", () => {
    expect(perfilEfetivo("carlos.goncalves@still.pt", "deus")).toBe("comercial");
    expect(perfilEfetivo("carlos.goncalves@still.pt", null)).toBe("comercial");
  });

  it("quem não está na lista não tem perfil nenhum, peça o que pedir", () => {
    expect(perfilEfetivo("intruso@gmail.com", "administrador")).toBe(null);
    expect(perfilEfetivo("", "administrador")).toBe(null);
  });
});

describe("quem pode trocar de perfil", () => {
  it("só o Raphael, e por isso entra em administrador", () => {
    expect(podeTrocarPerfil("raphael.toledo@still.pt")).toBe(true);
    expect(perfilPadrao("raphael.toledo@still.pt")).toBe("administrador");
    expect(perfisDe("raphael.toledo@still.pt")).toEqual(PERFIS);
  });

  it("os outros não têm nada para escolher", () => {
    for (const a of ACESSOS.filter((x) => x.email !== "raphael.toledo@still.pt")) {
      expect(podeTrocarPerfil(a.email), a.email).toBe(false);
    }
  });

  it("a troca dele vale, porque a lista lhe dá esses perfis", () => {
    for (const p of PERFIS) {
      expect(perfilEfetivo("raphael.toledo@still.pt", p)).toBe(p);
    }
  });
});

describe("a lista em si", () => {
  it("todos os perfis atribuídos existem", () => {
    for (const a of ACESSOS) {
      for (const p of a.perfis) expect(PERFIS, `${a.email}: ${p}`).toContain(p);
    }
  });

  it("ninguém aparece duas vezes — duas linhas para o mesmo email seria ambíguo", () => {
    const emails = ACESSOS.map((a) => a.email.toLowerCase());
    expect(new Set(emails).size).toBe(emails.length);
  });

  it("toda a gente tem pelo menos um perfil e um nome", () => {
    for (const a of ACESSOS) {
      expect(a.perfis.length, a.email).toBeGreaterThan(0);
      expect(a.nome, a.email).toBeTruthy();
    }
  });

  it("o nome vem da lista, não do fornecedor de identidade", () => {
    expect(nomeDe("luis.sousa@still.pt")).toBe("Luís Sousa");
    expect(nomeDe("intruso@gmail.com")).toBe(null);
  });
});
