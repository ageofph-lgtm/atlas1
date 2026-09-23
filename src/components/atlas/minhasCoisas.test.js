import { describe, it, expect } from "vitest";
import {
  eMinhaReserva, eMeuPedido, minhasReservas, meusPedidos,
  contarPorEstado, kpisComercial, inicioDoPeriodo, PERIODOS,
} from "@/components/atlas/minhasCoisas";

const carlos = { id: "u-carlos", full_name: "Carlos Gonçalves" };
const nuno = { id: "u-nuno", full_name: "Nuno Lopes" };

const reserva = (extra = {}) => ({
  id: "c1", serie: "NS-1", categoria: "str", estado: "pronta",
  reserva_cliente: "Transportes Águia", reserva_comercial: "Carlos Gonçalves",
  reserva_comercial_id: "u-carlos", ...extra,
});

describe("de quem é uma reserva", () => {
  it("reconhece pelo id", () => {
    expect(eMinhaReserva(reserva({ reserva_comercial: "escrito à mão" }), carlos)).toBe(true);
  });

  it("reconhece pelo nome quando o id é de uma sessão antiga", () => {
    // O que recupera o histórico: antes da entrada por email, o id era o da
    // sessão anónima e mudava de aparelho para aparelho.
    expect(eMinhaReserva(reserva({ reserva_comercial_id: "sessao-velha-123" }), carlos)).toBe(true);
  });

  it("não liga a maiúsculas nem a espaços no nome", () => {
    expect(eMinhaReserva(reserva({ reserva_comercial_id: "", reserva_comercial: "  carlos GONÇALVES " }), carlos)).toBe(true);
  });

  it("a reserva de outro comercial não é minha", () => {
    expect(eMinhaReserva(reserva(), nuno)).toBe(false);
  });

  it("um registo sem dono não é de ninguém", () => {
    // Sem esta regra, comparar vazio com vazio dava a reserva ao primeiro que
    // perguntasse — e uma saída direta apareceria nos KPIs de toda a gente.
    const orfa = reserva({ reserva_comercial: "", reserva_comercial_id: "" });
    expect(eMinhaReserva(orfa, carlos)).toBe(false);
    expect(eMinhaReserva(orfa, { id: "", full_name: "" })).toBe(false);
  });

  it("sem pessoa não é de ninguém", () => {
    expect(eMinhaReserva(reserva(), null)).toBe(false);
    expect(eMinhaReserva(reserva(), undefined)).toBe(false);
  });

  it("os pedidos seguem a mesma regra, noutros campos", () => {
    const p = { comercial: "Carlos Gonçalves", comercial_user_id: "u-carlos", texto: "bluespot" };
    expect(eMeuPedido(p, carlos)).toBe(true);
    expect(eMeuPedido(p, nuno)).toBe(false);
    expect(eMeuPedido({ comercial: "", comercial_user_id: "" }, carlos)).toBe(false);
  });
});

describe("minhasReservas", () => {
  const ciclos = [
    reserva({ id: "a", reserva_data: "2026-09-20T00:00:00Z" }),
    reserva({ id: "b", reserva_data: "2026-09-10T00:00:00Z" }),
    reserva({ id: "c", reserva_comercial: "Nuno Lopes", reserva_comercial_id: "u-nuno" }),
    reserva({ id: "d", reserva_cliente: null }),
  ];

  it("traz só as minhas, e só as que têm cliente", () => {
    expect(minhasReservas(ciclos, carlos).map((r) => r.ciclo.id)).toEqual(["a", "b"]);
  });

  it("diz o estado de cada uma — é esse o progresso que se quer acompanhar", () => {
    const r = minhasReservas([reserva({ estado: "em_execucao" })], carlos);
    expect(r[0].estado).toBe("em_execucao");
  });

  it("uma máquina já alugada continua a ser a minha reserva", () => {
    // O ciclo está aberto e ela volta: é dela que o comercial se tem de lembrar.
    const r = minhasReservas([reserva({ estado: "em_aluguer", data_saida: "2026-09-01T00:00:00Z" })], carlos);
    expect(r).toHaveLength(1);
    expect(r[0].estado).toBe("em_aluguer");
  });

  it("uma máquina vendida já não é uma reserva em curso", () => {
    // A venda fecha o ciclo. Contá-la aqui enchia a lista de trabalho acabado e
    // fazia a contagem no topo dizer mais do que há para acompanhar.
    const vendida = reserva({ estado: "fechado", tipo_saida: "vendida", data_saida: "2026-09-01T00:00:00Z" });
    expect(minhasReservas([vendida], carlos)).toEqual([]);
  });

  it("da mais recente para a mais antiga", () => {
    const desordenadas = [ciclos[1], ciclos[0]];
    expect(minhasReservas(desordenadas, carlos).map((r) => r.ciclo.id)).toEqual(["a", "b"]);
  });

  it("lista vazia ou sem pessoa não rebenta", () => {
    expect(minhasReservas([], carlos)).toEqual([]);
    expect(minhasReservas(ciclos, null)).toEqual([]);
    expect(minhasReservas()).toEqual([]);
  });
});

describe("meusPedidos e contagem", () => {
  const pedidos = [
    { id: "p1", comercial_user_id: "u-carlos", estado: "aberto", created_date: "2026-09-01T00:00:00Z" },
    { id: "p2", comercial_user_id: "u-carlos", estado: "concluido", created_date: "2026-09-20T00:00:00Z" },
    { id: "p3", comercial_user_id: "u-nuno", estado: "aberto", created_date: "2026-09-05T00:00:00Z" },
    { id: "p4", comercial: "Carlos Gonçalves", estado: "em_execucao", created_date: "2026-09-10T00:00:00Z" },
  ];

  it("traz só os meus, do mais recente para o mais antigo", () => {
    expect(meusPedidos(pedidos, carlos).map((p) => p.id)).toEqual(["p2", "p4", "p1"]);
  });

  it("conta por estado", () => {
    expect(contarPorEstado(meusPedidos(pedidos, carlos)))
      .toEqual({ aberto: 1, em_execucao: 1, concluido: 1, cancelado: 0 });
  });

  it("um estado em falta conta como aberto, que é o que o schema diz", () => {
    expect(contarPorEstado([{}]).aberto).toBe(1);
  });

  it("um estado desconhecido não inventa uma chave nova", () => {
    expect(contarPorEstado([{ estado: "marciano" }]))
      .toEqual({ aberto: 0, em_execucao: 0, concluido: 0, cancelado: 0 });
  });
});

describe("kpisComercial", () => {
  const agora = new Date("2026-09-23T00:00:00Z").getTime();
  const haDias = (n) => new Date(agora - n * 86400000).toISOString();
  const saida = (id, tipo, dias, dono = {}) => ({
    id, categoria: "str", tipo_saida: tipo, data_saida: haDias(dias),
    estado: tipo === "vendida" ? "fechado" : "em_aluguer", ...dono,
  });
  const meu = { reserva_comercial: "Carlos Gonçalves", reserva_comercial_id: "u-carlos" };
  const doNuno = { reserva_comercial: "Nuno Lopes", reserva_comercial_id: "u-nuno" };

  const ciclos = [
    saida("a", "alugada", 5, meu),
    saida("b", "vendida", 10, meu),
    saida("c", "alugada", 100, meu),
    saida("d", "vendida", 3, doNuno),
    saida("e", "alugada", 2),          // saída direta, sem comercial
    { id: "f", categoria: "str", estado: "pronta" }, // nunca saiu
  ];

  it("separa alugadas de vendidas, só as minhas", () => {
    const k = kpisComercial(ciclos, carlos, { desde: inicioDoPeriodo(30, agora) });
    expect(k.alugadas).toBe(1);
    expect(k.vendidas).toBe(1);
    expect(k.total).toBe(2);
  });

  it("o período corta pelo que ficou de fora", () => {
    const k = kpisComercial(ciclos, carlos, { desde: inicioDoPeriodo(365, agora) });
    expect(k.total).toBe(3);
  });

  it("sem período conta tudo", () => {
    expect(kpisComercial(ciclos, carlos, { desde: null }).total).toBe(3);
    expect(kpisComercial(ciclos, carlos).total).toBe(3);
  });

  it("diz quantas saídas não têm comercial — senão o total mentia por omissão", () => {
    // Este é o número que impede alguém de ler "2 vendas" como "só houve 2".
    const k = kpisComercial(ciclos, carlos, { desde: inicioDoPeriodo(30, agora) });
    expect(k.saidasNoPeriodo).toBe(4);
    expect(k.semComercial).toBe(1);
  });

  it("uma máquina que nunca saiu não conta para nada", () => {
    const k = kpisComercial([ciclos[5]], carlos, { desde: null });
    expect(k.total).toBe(0);
    expect(k.saidasNoPeriodo).toBe(0);
  });

  it("uma saída sem data fica de fora de um período, mas não de 'Tudo'", () => {
    const semData = [{ id: "x", categoria: "str", tipo_saida: "vendida", ...meu }];
    expect(kpisComercial(semData, carlos, { desde: inicioDoPeriodo(30, agora) }).total).toBe(0);
    expect(kpisComercial(semData, carlos, { desde: null }).total).toBe(0);
  });

  it("as saídas de outro comercial não entram nas minhas", () => {
    const k = kpisComercial(ciclos, nuno, { desde: inicioDoPeriodo(30, agora) });
    expect(k.total).toBe(1);
    expect(k.vendidas).toBe(1);
  });
});

describe("períodos", () => {
  it("o seletor tem um 'Tudo' que significa sem limite", () => {
    expect(PERIODOS.find((p) => p.chave === null)).toBeTruthy();
    expect(inicioDoPeriodo(null)).toBe(null);
  });

  it("30 dias dá uma data 30 dias atrás", () => {
    const agora = new Date("2026-09-23T00:00:00Z").getTime();
    expect(inicioDoPeriodo(30, agora)).toBe("2026-08-24T00:00:00.000Z");
  });
});
