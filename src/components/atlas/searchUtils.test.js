import { describe, it, expect } from "vitest";
import { matchCicloSearch } from "@/components/atlas/searchUtils";

const ciclo = {
  serie: "F20321Y00397",
  categoria: "str",
  cone_cor: "amarelo",
  cone_numero: "7",
  reserva_cliente: "Transportes Águia",
  observacoes: "Entrou com o mastro riscado",
};
const maquina = {
  modelo: "RX 60-25",
  mastro: "triplex",
  tipo_pneu: "super_elastico",
  acessorios: ["sideshift"],
};

const procura = (q) => matchCicloSearch(ciclo, maquina, q);

describe("matchCicloSearch", () => {
  it("sem procura mostra tudo", () => {
    expect(procura("")).toBe(true);
    expect(procura("   ")).toBe(true);
    expect(procura(undefined)).toBe(true);
  });

  it("encontra por série, inteira ou por pedaço, sem ligar a maiúsculas", () => {
    expect(procura("F20321Y00397")).toBe(true);
    expect(procura("f20321")).toBe(true);
    expect(procura("00397")).toBe(true);
  });

  it("encontra por modelo e por cliente", () => {
    expect(procura("RX 60")).toBe(true);
    expect(procura("águia")).toBe(true);
  });

  it("encontra pelas características, pelo valor guardado e pelo rótulo", () => {
    expect(procura("triplex")).toBe(true);
    expect(procura("sideshift")).toBe(true);
  });

  it("encontra pelo texto das observações", () => {
    expect(procura("riscado")).toBe(true);
  });

  it("vários termos é OU — basta um encaixar", () => {
    expect(procura("inexistente triplex")).toBe(true);
    expect(procura("inexistente nenhures")).toBe(false);
  });

  it("não encontra o que lá não está", () => {
    expect(procura("duplex")).toBe(false);
  });

  it("um número curto encontra o cone", () => {
    expect(procura("7")).toBe(true);
    expect(procura("07")).toBe(true);
    expect(procura("cone 7")).toBe(true);
  });

  it("um número curto também encontra a série que o tem — procurar pelo fim da série", () => {
    // Medido a 06/10: "592" não encontrava a máquina cuja série acaba em 592.
    const doFim = { ...ciclo, serie: "F20321Y00592", cone_cor: null, cone_numero: null };
    expect(matchCicloSearch(doFim, maquina, "592")).toBe(true);
    // "21" não é o cone desta máquina, mas está na série (F20321…).
    expect(procura("21")).toBe(true);
    expect(procura("999")).toBe(false);
  });

  it("com a palavra \"cone\" ou com a cor, é só o cone", () => {
    expect(procura("cone 21")).toBe(false);
    expect(procura("amarelo 21")).toBe(false);
  });

  it("cor + número procura o cone exato, com a cor escrita por inteiro ou começada", () => {
    expect(procura("amarelo 7")).toBe(true);
    expect(procura("7 amarelo")).toBe(true);
    expect(procura("am 7")).toBe(true);
    expect(procura("azul 7")).toBe(false);
  });

  it("uma máquina sem cone não aparece numa pesquisa só de cone", () => {
    expect(matchCicloSearch({ ...ciclo, cone_cor: null, cone_numero: null }, maquina, "cone 7")).toBe(false);
    expect(matchCicloSearch({ ...ciclo, cone_cor: null, cone_numero: null }, maquina, "amarelo 7")).toBe(false);
    expect(matchCicloSearch({ ...ciclo, cone_numero: "" }, maquina, "cone 0")).toBe(false);
  });

  it("números maiores e palavras que não são cor continuam a ser pesquisa normal", () => {
    expect(procura("00397")).toBe(true);
    expect(procura("RX 60")).toBe(true);
    // "ver" tanto é verde como vermelho: não é cor de cone, é texto.
    expect(matchCicloSearch({ ...ciclo, observacoes: "ver 7 dias" }, maquina, "ver 7")).toBe(true);
  });

  it("aguenta uma máquina em falta", () => {
    expect(matchCicloSearch(ciclo, null, "f20321")).toBe(true);
    expect(matchCicloSearch(ciclo, undefined, "rx 60")).toBe(false);
  });
});
