import { describe, it, expect, beforeEach, vi, afterAll } from "vitest";
import { avaliarSessao, abrirSessao, guardarPerfil, limparSessao, diasDesde, SESSAO_DIAS } from "@/components/atlas/sessao";

// O ambiente dos testes é Node, que não tem localStorage. Um duplo em memória
// chega: o que interessa testar são as regras, não o armazenamento do browser.
const memoria = new Map();
vi.stubGlobal("localStorage", {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k),
  clear: () => memoria.clear(),
});
afterAll(() => vi.unstubAllGlobals());

const DIA = 86400000;
const agora = new Date("2026-09-23T12:00:00Z").getTime();
const haDias = (n) => new Date(agora - n * DIA).toISOString();

describe("avaliarSessao", () => {
  const email = "carlos.goncalves@still.pt";

  it("sem nada guardado, a sessão é nova", () => {
    expect(avaliarSessao(null, email, { agora })).toEqual({ valida: false, motivo: "nova" });
  });

  it("dentro dos 60 dias continua, e diz quantos faltam", () => {
    const r = avaliarSessao({ email, desde: haDias(10) }, email, { agora });
    expect(r.valida).toBe(true);
    expect(r.idade).toBe(10);
    expect(r.faltam).toBe(SESSAO_DIAS - 10);
  });

  it("aos 60 dias exatos já expirou — o limite é o fim, não mais um dia", () => {
    expect(avaliarSessao({ email, desde: haDias(59) }, email, { agora }).valida).toBe(true);
    const r = avaliarSessao({ email, desde: haDias(60) }, email, { agora });
    expect(r.valida).toBe(false);
    expect(r.motivo).toBe("expirada");
  });

  it("uma sessão de outra pessoa no mesmo aparelho não serve", () => {
    const r = avaliarSessao({ email: "luis.sousa@still.pt", desde: haDias(1) }, email, { agora });
    expect(r).toMatchObject({ valida: false, motivo: "outro_email" });
  });

  it("a comparação de email não liga a maiúsculas nem a espaços", () => {
    const r = avaliarSessao({ email: " CARLOS.Goncalves@Still.PT " }, email, { agora });
    expect(r.motivo).not.toBe("outro_email");
  });

  it("sem email não há sessão, haja o que houver guardado", () => {
    expect(avaliarSessao({ email, desde: haDias(1) }, "", { agora }).motivo).toBe("sem_email");
    expect(avaliarSessao({ email, desde: haDias(1) }, null, { agora }).motivo).toBe("sem_email");
  });

  it("uma data corrompida não deixa passar — o lado seguro do erro é recusar", () => {
    const r = avaliarSessao({ email, desde: "não é data" }, email, { agora });
    expect(r).toEqual({ valida: false, motivo: "data_invalida" });
  });

  it("dá sempre um motivo, para o ecrã poder explicar-se", () => {
    const casos = [null, { email, desde: haDias(99) }, { email: "outro@still.pt", desde: haDias(1) }];
    for (const c of casos) expect(avaliarSessao(c, email, { agora }).motivo).toBeTruthy();
  });
});

describe("abrirSessao", () => {
  beforeEach(() => { localStorage.clear(); });

  it("quem está na lista entra e a sessão começa a contar", () => {
    const r = abrirSessao("carlos.goncalves@still.pt", { agora });
    expect(r.perfil).toBe("comercial");
    expect(r.desde).toBeTruthy();
  });

  it("quem não está na lista não abre sessão nenhuma", () => {
    const r = abrirSessao("intruso@gmail.com", { agora });
    expect(r.perfil).toBe(null);
    expect(localStorage.getItem("atlas:sessao")).toBe(null);
  });

  it("voltar dentro do prazo mantém o dia em que começou — não renova sozinha", () => {
    // Se cada visita reiniciasse a contagem, os 60 dias nunca chegariam ao fim
    // para quem usa a app todos os dias, que é toda a gente.
    localStorage.setItem("atlas:sessao", JSON.stringify({
      email: "carlos.goncalves@still.pt", desde: haDias(30), perfil: "comercial",
    }));
    const r = abrirSessao("carlos.goncalves@still.pt", { agora });
    expect(diasDesde(r.desde, agora)).toBe(30);
    expect(r.faltam).toBe(30);
  });

  it("passados os 60 dias a contagem recomeça do zero", () => {
    localStorage.setItem("atlas:sessao", JSON.stringify({
      email: "carlos.goncalves@still.pt", desde: haDias(70), perfil: "comercial",
    }));
    const r = abrirSessao("carlos.goncalves@still.pt", { agora });
    expect(r.estado.motivo).toBe("expirada");
    expect(diasDesde(r.desde, agora)).toBe(0);
  });

  it("um perfil guardado que a lista já não dá é ignorado", () => {
    // O caso que interessa: alguém edita o armazenamento do browser à mão.
    localStorage.setItem("atlas:sessao", JSON.stringify({
      email: "carlos.goncalves@still.pt", desde: haDias(1), perfil: "administrador",
    }));
    expect(abrirSessao("carlos.goncalves@still.pt", { agora }).perfil).toBe("comercial");
  });

  it("tirar alguém da lista põe-no fora já, sem esperar pelos 60 dias", () => {
    // É a revogação: a sessão dele está válida e recente, mas o email deixou de
    // constar, por isso não há perfil e não há entrada.
    localStorage.setItem("atlas:sessao", JSON.stringify({
      email: "exfuncionario@still.pt", desde: haDias(1), perfil: "comercial",
    }));
    expect(abrirSessao("exfuncionario@still.pt", { agora }).perfil).toBe(null);
  });

  it("o Raphael entra em administrador e a escolha dele é respeitada", () => {
    expect(abrirSessao("raphael.toledo@still.pt", { agora }).perfil).toBe("administrador");
    localStorage.setItem("atlas:sessao", JSON.stringify({
      email: "raphael.toledo@still.pt", desde: haDias(1), perfil: "logistica",
    }));
    expect(abrirSessao("raphael.toledo@still.pt", { agora }).perfil).toBe("logistica");
  });

  it("armazenamento corrompido não impede de entrar", () => {
    localStorage.setItem("atlas:sessao", "{isto não é json");
    expect(abrirSessao("luis.sousa@still.pt", { agora }).perfil).toBe("logistica");
  });
});

describe("guardarPerfil", () => {
  beforeEach(() => { localStorage.clear(); });

  it("o Raphael troca de perfil e a troca fica", () => {
    abrirSessao("raphael.toledo@still.pt", { agora });
    expect(guardarPerfil("raphael.toledo@still.pt", "comercial")).toBe("comercial");
    expect(abrirSessao("raphael.toledo@still.pt", { agora }).perfil).toBe("comercial");
  });

  it("trocar de perfil não reinicia os 60 dias", () => {
    localStorage.setItem("atlas:sessao", JSON.stringify({
      email: "raphael.toledo@still.pt", desde: haDias(40), perfil: "administrador",
    }));
    guardarPerfil("raphael.toledo@still.pt", "logistica");
    expect(diasDesde(abrirSessao("raphael.toledo@still.pt", { agora }).desde, agora)).toBe(40);
  });

  it("quem só tem um perfil não consegue mudar para outro", () => {
    expect(guardarPerfil("carlos.goncalves@still.pt", "administrador")).toBe("comercial");
  });

  it("quem não está na lista não grava nada", () => {
    expect(guardarPerfil("intruso@gmail.com", "administrador")).toBe(null);
  });
});

describe("limparSessao", () => {
  it("apaga o que estava guardado", () => {
    abrirSessao("luis.sousa@still.pt", { agora });
    limparSessao();
    expect(localStorage.getItem("atlas:sessao")).toBe(null);
  });
});

describe("diasDesde", () => {
  it("conta dias inteiros e recusa lixo", () => {
    expect(diasDesde(haDias(3), agora)).toBe(3);
    expect(diasDesde("qualquer coisa", agora)).toBe(null);
    expect(diasDesde(null, agora)).toBe(null);
  });
});
