import { describe, it, expect } from "vitest";
import { camposDeReserva } from "@/components/atlas/reservaPayload";

const gestor = { id: "u-gestor", full_name: "Catarina Gonçalves", perfil: "gestor_frota" };
const comercial = { id: "u-com", full_name: "Carlos Gonçalves", perfil: "comercial" };

const nova = { id: "c1", serie: "51612345", reserva_cliente: null };
const jaReservada = { ...nova, reserva_cliente: "Transportes Águia", reserva_comercial: "Nuno Lopes" };

const dados = (extra = {}) => ({
  reserva_cliente: "Transportes Águia",
  reserva_data: "2026-12-01",
  ...extra,
});

describe("reserva feita pela gestão de frota", () => {
  it("grava o comercial escolhido pelo nome, sem id", () => {
    // O comercial indicado pode nem ter conta na aplicação — o nome é o que
    // fica, e «As minhas reservas» já o encontra por nome.
    const campos = camposDeReserva({
      data: dados({ reserva_comercial_nome: "Nuno Lopes" }),
      ciclo: nova,
      autor: "Catarina Gonçalves",
      currentUser: gestor,
    });
    expect(campos.reserva_comercial).toBe("Nuno Lopes");
    expect(campos.reserva_comercial_id).toBe("");
  });

  it("o relógio das três semanas só arranca quando a reserva nasce", () => {
    const criada = camposDeReserva({
      data: dados({ reserva_comercial_nome: "Nuno Lopes" }),
      ciclo: nova,
      autor: "Catarina Gonçalves",
      currentUser: gestor,
    });
    expect(criada.reserva_criada_em).toBeTruthy();

    // Editar uma reserva que já existe — outro cliente, outra data, outro
    // comercial — não pode reiniciar o prazo.
    const editada = camposDeReserva({
      data: dados({ reserva_cliente: "Outro cliente", reserva_comercial_nome: "João Neves" }),
      ciclo: jaReservada,
      autor: "Catarina Gonçalves",
      currentUser: gestor,
    });
    expect(editada.reserva_criada_em).toBeUndefined();
    expect(editada.reserva_comercial).toBe("João Neves");
  });

  it("sem comercial escolhido fica quem reservou, como antes", () => {
    const campos = camposDeReserva({
      data: dados({ reserva_comercial_nome: null }),
      ciclo: nova,
      autor: "Catarina Gonçalves",
      currentUser: gestor,
    });
    expect(campos.reserva_comercial).toBe("Catarina Gonçalves");
    expect(campos.reserva_comercial_id).toBe("u-gestor");
  });

  it("cancelar limpa cliente, data e responsável", () => {
    const campos = camposDeReserva({
      data: { reserva_cliente: null, reserva_data: null },
      ciclo: jaReservada,
      autor: "Catarina Gonçalves",
      currentUser: gestor,
    });
    expect(campos.reserva_cliente).toBeNull();
    expect(campos.reserva_data).toBeNull();
    expect(campos.reserva_comercial).toBeNull();
    expect(campos.reserva_comercial_id).toBe("");
    expect(campos.reserva_criada_em).toBeNull();
  });
});

describe("reserva feita por um comercial", () => {
  it("continua a ser dele: nome e id do autor", () => {
    // Para um comercial o campo do responsável nem aparece; o comportamento é
    // exatamente o de antes.
    const campos = camposDeReserva({
      data: dados(),
      ciclo: nova,
      autor: "Carlos Gonçalves",
      currentUser: comercial,
    });
    expect(campos.reserva_comercial).toBe("Carlos Gonçalves");
    expect(campos.reserva_comercial_id).toBe("u-com");
  });
});