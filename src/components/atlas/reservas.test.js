import { describe, it, expect } from "vitest";
import {
  PRAZO_RESERVA_DIAS,
  reservaAtiva,
  diasDeReserva,
  diasParaExpirar,
  reservaExpirada,
  avisoDoPrazo,
  notaDaExpiracao,
} from "@/components/atlas/reservas";

const AGORA = new Date("2026-11-11T12:00:00Z");
const haDias = (n) => new Date(AGORA.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

const reservada = (extra = {}) => ({
  id: "c1",
  serie: "516301M00007",
  estado: "pronta",
  reserva_cliente: "Torres Aladas",
  reserva_data: "2026-11-20",
  reserva_comercial: "Carlos Gonçalves",
  reserva_comercial_id: "u9",
  reserva_criada_em: haDias(0),
  ...extra,
});

describe("reservaAtiva", () => {
  it("conta só máquinas com cliente que ainda não saíram", () => {
    expect(reservaAtiva(reservada())).toBe(true);
    expect(reservaAtiva(reservada({ reserva_cliente: "" }))).toBe(false);
    expect(reservaAtiva(reservada({ estado: "fechado" }))).toBe(false);
    // Saiu = reserva usada; já não está à espera de ninguém.
    expect(reservaAtiva(reservada({ data_saida: "2026-11-01T00:00:00Z", estado: "em_aluguer" }))).toBe(false);
  });
});

describe("diasDeReserva", () => {
  it("conta dias inteiros desde que a reserva foi feita", () => {
    expect(diasDeReserva(reservada({ reserva_criada_em: haDias(0) }), AGORA)).toBe(0);
    expect(diasDeReserva(reservada({ reserva_criada_em: haDias(20) }), AGORA)).toBe(20);
  });

  it("devolve nulo quando o registo é antigo e não tem relógio", () => {
    expect(diasDeReserva(reservada({ reserva_criada_em: null }), AGORA)).toBe(null);
    expect(diasDeReserva(reservada({ reserva_criada_em: "não é data" }), AGORA)).toBe(null);
  });
});

describe("reservaExpirada", () => {
  it("expira exatamente ao fim de três semanas, não antes", () => {
    const umDiaAntes = reservada({ reserva_criada_em: haDias(PRAZO_RESERVA_DIAS - 1) });
    const noPrazo = reservada({ reserva_criada_em: haDias(PRAZO_RESERVA_DIAS) });
    expect(reservaExpirada(umDiaAntes, AGORA)).toBe(false);
    expect(reservaExpirada(noPrazo, AGORA)).toBe(true);
  });

  it("não expira o que já saiu, nem o que fechou", () => {
    const saiu = reservada({ reserva_criada_em: haDias(60), data_saida: "2026-10-01T00:00:00Z", estado: "em_aluguer" });
    const fechado = reservada({ reserva_criada_em: haDias(60), estado: "fechado" });
    expect(reservaExpirada(saiu, AGORA)).toBe(false);
    expect(reservaExpirada(fechado, AGORA)).toBe(false);
  });

  it("não inventa prazo quando não há relógio — é a função que o cria", () => {
    expect(reservaExpirada(reservada({ reserva_criada_em: null }), AGORA)).toBe(false);
  });
});

describe("avisoDoPrazo", () => {
  it("avisa a partir dos três dias que faltam", () => {
    expect(avisoDoPrazo(reservada({ reserva_criada_em: haDias(17) }), AGORA)).toEqual({ tom: "ok", texto: "expira em 4 dias" });
    expect(avisoDoPrazo(reservada({ reserva_criada_em: haDias(18) }), AGORA)).toEqual({ tom: "ultimo", texto: "expira em 3 dias" });
    expect(avisoDoPrazo(reservada({ reserva_criada_em: haDias(20) }), AGORA)).toEqual({ tom: "ultimo", texto: "expira em 1 dia" });
    expect(avisoDoPrazo(reservada({ reserva_criada_em: haDias(21) }), AGORA)).toEqual({ tom: "ultimo", texto: "expira hoje" });
    expect(avisoDoPrazo(reservada({ reserva_criada_em: haDias(25) }), AGORA)).toEqual({ tom: "expirada", texto: "reserva fora do prazo" });
  });

  it("cala-se quando não há reserva ou não há relógio", () => {
    expect(avisoDoPrazo(reservada({ reserva_cliente: null }), AGORA)).toBe(null);
    expect(avisoDoPrazo(reservada({ reserva_criada_em: null }), AGORA)).toBe(null);
  });
});

describe("notaDaExpiracao", () => {
  it("diz o cliente e os dias, para o histórico da máquina", () => {
    const nota = notaDaExpiracao(reservada({ reserva_criada_em: haDias(21) }), AGORA);
    expect(nota).toBe("Reserva de Torres Aladas expirou: 21 dias sem saída (prazo 21 dias).");
  });
});

describe("diasParaExpirar", () => {
  it("fica negativo depois do prazo", () => {
    expect(diasParaExpirar(reservada({ reserva_criada_em: haDias(22) }), AGORA)).toBe(-1);
    expect(diasParaExpirar(reservada({ reserva_criada_em: null }), AGORA)).toBe(null);
  });
});
