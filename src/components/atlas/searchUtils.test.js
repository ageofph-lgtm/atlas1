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

  it("não procura pelo número do cone — os dígitos apanhariam séries e anos", () => {
    // Para o cone existe o filtro próprio, com cor e número exatos.
    const semDigitos = { ...ciclo, serie: "AB-CD", observacoes: "", reserva_cliente: "" };
    expect(matchCicloSearch(semDigitos, { modelo: "EXV" }, "7")).toBe(false);
  });

  it("aguenta uma máquina em falta", () => {
    expect(matchCicloSearch(ciclo, null, "f20321")).toBe(true);
    expect(matchCicloSearch(ciclo, undefined, "rx 60")).toBe(false);
  });
});
