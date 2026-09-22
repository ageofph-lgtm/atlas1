import { describe, it, expect } from "vitest";
import { ocupacaoPatio, taxaUtilizacao, balancoPeriodo, paradasHaMuito, diasDesde } from "@/components/atlas/ocupacaoPatio";

const c = (id, estado, extra = {}) => ({ id, serie: "NS-" + id, categoria: "str", estado, ...extra });

describe("ocupacaoPatio", () => {
  // O caso que motivou isto: quem via "ciclos não fechados" via 4, mas só 3
  // estavam mesmo nas instalações.
  const parque = [
    c(1, "pronta"),
    c(2, "classificada"),
    c(3, "em_execucao"),
    c(4, "em_aluguer", { data_saida: "2026-09-01T00:00:00Z" }),
    c(5, "fechado"),
  ];

  it("separa o que está cá do que saiu — era esta a conta que faltava", () => {
    const o = ocupacaoPatio(parque);
    expect(o.noPatio).toBe(3);
    expect(o.fora).toBe(1);
    expect(o.total).toBe(4);
  });

  it("uma máquina alugada NÃO conta como estando no pátio", () => {
    // O ciclo dela continua aberto até voltar; é por isso que entrava na conta antiga.
    const o = ocupacaoPatio([c(1, "em_aluguer", { data_saida: "2026-09-01T00:00:00Z" })]);
    expect(o.noPatio).toBe(0);
    expect(o.fora).toBe(1);
    expect(o.total).toBe(1);
  });

  it("'retorno' também está fora — vem a caminho, ainda não chegou", () => {
    const o = ocupacaoPatio([c(1, "retorno", { data_saida: "2026-09-01T00:00:00Z" })]);
    expect(o.fora).toBe(1);
    expect(o.noPatio).toBe(0);
  });

  it("um ciclo fechado não conta para lado nenhum — a máquina foi vendida ou o ciclo acabou", () => {
    const o = ocupacaoPatio([c(1, "fechado")]);
    expect(o.total).toBe(0);
  });

  it("parque vazio não rebenta", () => {
    expect(ocupacaoPatio([]).total).toBe(0);
    expect(ocupacaoPatio().total).toBe(0);
  });
});

describe("o que está cá, em detalhe", () => {
  const parque = [
    c(1, "pronta"),
    c(2, "pronta", { reserva_cliente: "Transportes Águia" }),
    c(3, "classificada"),
    c(4, "em_execucao"),
    c(5, "classificada", { categoria: "sucata" }),
    c(6, "em_aluguer", { data_saida: "2026-09-01T00:00:00Z" }),
  ];
  const o = ocupacaoPatio(parque);

  it("distingue o que pode sair já do que está prometido", () => {
    expect(o.prontas).toBe(2);
    expect(o.disponiveis).toBe(1);
    expect(o.reservadas).toBe(1);
  });

  it("conta o que está em preparação", () => {
    expect(o.emPreparacao).toBe(2);
  });

  it("a sucata conta como indefinida, não como em preparação", () => {
    // O estado efetivo dela é "indefinido" — não segue o fluxo da oficina.
    expect(o.indefinidas).toBe(1);
  });

  it("as partes somam o que está no pátio", () => {
    expect(o.prontas + o.emPreparacao + o.indefinidas).toBe(o.noPatio);
  });
});

describe("taxaUtilizacao", () => {
  it("diz quanto do parque está a render", () => {
    expect(taxaUtilizacao({ fora: 8, total: 32 })).toBe(25);
    expect(taxaUtilizacao({ fora: 1, total: 3 })).toBe(33.3);
  });

  it("sem parque devolve nada, em vez de fingir 0%", () => {
    expect(taxaUtilizacao({ fora: 0, total: 0 })).toBe(null);
  });

  it("tudo alugado é 100%", () => {
    expect(taxaUtilizacao({ fora: 5, total: 5 })).toBe(100);
  });
});

describe("balancoPeriodo", () => {
  const desde = new Date("2026-09-01T00:00:00Z");
  const ciclos = [
    c(1, "pronta", { data_entrada: "2026-09-05T00:00:00Z" }),
    c(2, "pronta", { data_entrada: "2026-09-06T00:00:00Z" }),
    c(3, "pronta", { data_entrada: "2026-08-01T00:00:00Z" }),
    c(4, "fechado", { data_entrada: "2026-08-01T00:00:00Z", data_saida: "2026-09-10T00:00:00Z", tipo_saida: "vendida" }),
    c(5, "em_aluguer", { data_entrada: "2026-08-01T00:00:00Z", data_saida: "2026-09-11T00:00:00Z", tipo_saida: "alugada" }),
  ];

  it("dá a diferença feita, para ninguém ter de a fazer de cabeça", () => {
    const b = balancoPeriodo(ciclos, desde);
    expect(b.entradas).toBe(2);
    expect(b.saidas).toBe(2);
    expect(b.balanco).toBe(0);
  });

  it("separa venda de aluguer", () => {
    const b = balancoPeriodo(ciclos, desde);
    expect(b.vendidas).toBe(1);
    expect(b.alugadas).toBe(1);
  });

  it("o balanço é negativo quando sai mais do que entra", () => {
    const b = balancoPeriodo([ciclos[3], ciclos[4]], desde);
    expect(b.balanco).toBe(-2);
  });

  it("ignora o que aconteceu antes do período", () => {
    const b = balancoPeriodo(ciclos, new Date("2026-09-10T12:00:00Z"));
    expect(b.entradas).toBe(0);
    expect(b.saidas).toBe(1);
  });
});

describe("paradasHaMuito", () => {
  const agora = new Date("2026-09-22T00:00:00Z").getTime();
  const ciclos = [
    c(1, "pronta", { data_pronta: "2026-07-01T00:00:00Z" }),
    c(2, "pronta", { data_pronta: "2026-09-20T00:00:00Z" }),
    c(3, "pronta", { data_pronta: "2026-08-01T00:00:00Z" }),
    c(4, "classificada", { data_pronta: "2026-01-01T00:00:00Z" }),
    c(5, "em_aluguer", { data_pronta: "2026-01-01T00:00:00Z", data_saida: "2026-02-01T00:00:00Z" }),
  ];

  it("encontra o capital parado, da mais antiga para a mais recente", () => {
    const r = paradasHaMuito(ciclos, { dias: 30, agora });
    expect(r.map((x) => x.ciclo.id)).toEqual([1, 3]);
    expect(r[0].dias).toBeGreaterThan(r[1].dias);
  });

  it("uma máquina alugada não está parada — está a render", () => {
    const r = paradasHaMuito(ciclos, { dias: 30, agora });
    expect(r.map((x) => x.ciclo.id)).not.toContain(5);
  });

  it("o que ainda não está pronto não conta como parado", () => {
    const r = paradasHaMuito(ciclos, { dias: 30, agora });
    expect(r.map((x) => x.ciclo.id)).not.toContain(4);
  });

  it("o limite de dias é respeitado", () => {
    expect(paradasHaMuito(ciclos, { dias: 90, agora })).toHaveLength(0);
    expect(paradasHaMuito(ciclos, { dias: 1, agora })).toHaveLength(3);
  });
});

describe("diasDesde", () => {
  const agora = new Date("2026-09-22T00:00:00Z").getTime();
  it("conta dias inteiros", () => {
    expect(diasDesde("2026-09-12T00:00:00Z", agora)).toBe(10);
  });
  it("sem data não inventa zero", () => {
    expect(diasDesde(null, agora)).toBe(null);
    expect(diasDesde(undefined, agora)).toBe(null);
  });
});
