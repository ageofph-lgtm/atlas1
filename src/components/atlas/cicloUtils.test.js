import { describe, it, expect, beforeEach } from "vitest";
import { instalarBase44, registo } from "@/test/base44Duplo";
import {
  estadoEfetivo,
  isCategoriaSemEstado,
  familiaDoModelo,
  matchModeloFamilia,
  normalizarEstadosIndefinidos,
  hasFiltrosAtivos,
  passesCicloFilters,
  FILTROS_VAZIOS,
  isHistorico,
  tabFilterCiclo,
  classificarCiclosAbertos,
  isVenda,
  isAluguer,
  podeGerirEstadoOficina,
  cicloOcupaCone, temCone, LIBERTAR_CONE,
} from "@/components/atlas/cicloUtils";

let base44;
beforeEach(() => { base44 = instalarBase44(); });

describe("estadoEfetivo", () => {
  it("dá 'indefinido' a sucata e indefinida, que não seguem o fluxo da oficina", () => {
    expect(estadoEfetivo({ categoria: "sucata", estado: "classificada" })).toBe("indefinido");
    expect(estadoEfetivo({ categoria: "indefinida", estado: "pronta" })).toBe("indefinido");
  });

  it("respeita os estados terminais mesmo em sucata — são factos do ciclo, não do fluxo", () => {
    expect(estadoEfetivo({ categoria: "sucata", estado: "em_aluguer" })).toBe("em_aluguer");
    expect(estadoEfetivo({ categoria: "sucata", estado: "fechado" })).toBe("fechado");
    expect(estadoEfetivo({ categoria: "indefinida", estado: "retorno" })).toBe("retorno");
  });

  it("deixa as outras categorias em paz", () => {
    expect(estadoEfetivo({ categoria: "str", estado: "pronta" })).toBe("pronta");
  });

  it("aguenta um ciclo em falta", () => {
    expect(estadoEfetivo(null)).toBe(null);
    expect(isCategoriaSemEstado(undefined)).toBe(false);
  });
});

describe("famílias de modelo", () => {
  // A STILL escreve os modelos com espaços e hífens que não estão na família.
  it.each([
    ["RX 60-25", "rx60"],
    ["RX 20-16", "rx20"],
    ["FM-X 14", "fmx"],
    ["EXV 14", "exv"],
    ["EXU 20", "exu"],
    ["OPX 20", "opx"],
  ])("%s pertence a %s", (modelo, esperado) => {
    expect(familiaDoModelo(modelo)).toBe(esperado);
  });

  it("o que não encaixa em nenhuma família vai para 'outras'", () => {
    expect(familiaDoModelo("Empilhador qualquer")).toBe("outras");
    expect(familiaDoModelo("")).toBe("outras");
    expect(familiaDoModelo(undefined)).toBe("outras");
  });

  it("sem famílias escolhidas não filtra nada", () => {
    expect(matchModeloFamilia({ modelo: "RX 60-25" }, [])).toBe(true);
    expect(matchModeloFamilia({ modelo: "RX 60-25" }, undefined)).toBe(true);
  });

  it("com famílias escolhidas é OR entre elas", () => {
    expect(matchModeloFamilia({ modelo: "RX 60-25" }, ["rx20", "rx60"])).toBe(true);
    expect(matchModeloFamilia({ modelo: "EXV 14" }, ["rx20", "rx60"])).toBe(false);
  });
});

describe("classificarCiclosAbertos — o guarda da máquina duplicada", () => {
  // O bug: uma máquina alugada TEM data_saida, por isso o guarda antigo
  // (procurar um ciclo sem data_saida) nunca a via e deixava registá-la outra vez.
  const noPatio = { id: "a", estado: "pronta", data_entrada: "2026-09-01T00:00:00Z" };
  const alugada = { id: "b", estado: "em_aluguer", data_saida: "2026-09-05T00:00:00Z" };
  const fechado = { id: "c", estado: "fechado" };

  it("vê a máquina que está no pátio", () => {
    const { noPatio: p, fora } = classificarCiclosAbertos([noPatio, fechado]);
    expect(p.id).toBe("a");
    expect(fora).toBe(null);
  });

  it("vê a máquina que saiu para aluguer, apesar de ter data de saída", () => {
    const { noPatio: p, fora } = classificarCiclosAbertos([alugada, fechado]);
    expect(fora.id).toBe("b");
    expect(p).toBe(null);
  });

  it("'retorno' também conta como fora do pátio", () => {
    const { fora } = classificarCiclosAbertos([{ id: "r", estado: "retorno", data_saida: "2026-09-02T00:00:00Z" }]);
    expect(fora.id).toBe("r");
  });

  it("ignora os ciclos fechados — esses são história", () => {
    const { noPatio: p, fora } = classificarCiclosAbertos([fechado]);
    expect(p).toBe(null);
    expect(fora).toBe(null);
  });

  it("havendo vários, fica com o mais recente", () => {
    const antigo = { id: "v", estado: "pronta", data_entrada: "2026-01-01T00:00:00Z" };
    const { noPatio: p } = classificarCiclosAbertos([antigo, noPatio]);
    expect(p.id).toBe("a");
  });
});

describe("venda e aluguer", () => {
  it("só é venda quando está marcada como tal", () => {
    expect(isVenda({ tipo_saida: "vendida" })).toBe(true);
    expect(isVenda({ tipo_saida: "alugada" })).toBe(false);
  });

  it("ciclo antigo sem tipo_saida conta como aluguer — a venda não existia no fluxo", () => {
    const legado = { data_saida: "2025-03-01T00:00:00Z" };
    expect(isAluguer(legado)).toBe(true);
    expect(isVenda(legado)).toBe(false);
  });

  it("sem data de saída não é nem uma coisa nem outra", () => {
    expect(isAluguer({ tipo_saida: "alugada" })).toBe(false);
  });
});

describe("filtros", () => {
  const maquina = { modelo: "RX 60-25", mastro: "triplex", tipo_pneu: "super_elastico" };
  const ciclo = { categoria: "str", estado: "pronta", cone_cor: "amarelo", cone_numero: "7" };

  it("os filtros vazios não escondem nada", () => {
    expect(hasFiltrosAtivos(FILTROS_VAZIOS)).toBe(false);
    expect(passesCicloFilters(ciclo, maquina, FILTROS_VAZIOS)).toBe(true);
  });

  it("o filtro de estado usa o estado efetivo, não o gravado", () => {
    const sucata = { categoria: "sucata", estado: "classificada" };
    expect(passesCicloFilters(sucata, null, { ...FILTROS_VAZIOS, estado: "indefinido" })).toBe(true);
    expect(passesCicloFilters(sucata, null, { ...FILTROS_VAZIOS, estado: "classificada" })).toBe(false);
  });

  it("o número do cone é comparado exatamente, para os dígitos não apanharem séries", () => {
    expect(passesCicloFilters(ciclo, maquina, { ...FILTROS_VAZIOS, coneNumero: "7" })).toBe(true);
    expect(passesCicloFilters(ciclo, maquina, { ...FILTROS_VAZIOS, coneNumero: "70" })).toBe(false);
  });

  it("compara o cone como texto mesmo que venha número da base de dados", () => {
    expect(passesCicloFilters({ ...ciclo, cone_numero: 7 }, maquina, { ...FILTROS_VAZIOS, coneNumero: "7" })).toBe(true);
  });

  it("reconhece cada tipo de filtro como ativo", () => {
    expect(hasFiltrosAtivos({ ...FILTROS_VAZIOS, categoria: "str" })).toBe(true);
    expect(hasFiltrosAtivos({ ...FILTROS_VAZIOS, coneNumero: "3" })).toBe(true);
    expect(hasFiltrosAtivos({ ...FILTROS_VAZIOS, modelos: ["rx60"] })).toBe(true);
    expect(hasFiltrosAtivos({ ...FILTROS_VAZIOS, coneNumero: "   " })).toBe(false);
  });
});

describe("abas", () => {
  it("sucata nunca cai em POR FAZER nem em PRONTAS", () => {
    const sucata = { categoria: "sucata", estado: "classificada" };
    expect(tabFilterCiclo("por_fazer", sucata)).toBe(false);
    expect(tabFilterCiclo("prontas", sucata)).toBe(false);
    expect(tabFilterCiclo("sucata", sucata)).toBe(true);
  });

  it("um ciclo fechado é histórico e fica fora da operação", () => {
    const fechado = { categoria: "str", estado: "fechado" };
    expect(isHistorico(fechado)).toBe(true);
    expect(tabFilterCiclo("fechados", fechado)).toBe(true);
    expect(tabFilterCiclo("por_fazer", fechado)).toBe(false);
  });

  it("'todas' aceita tudo e uma aba desconhecida não aceita nada", () => {
    expect(tabFilterCiclo("todas", { categoria: "str", estado: "pronta" })).toBe(true);
    expect(tabFilterCiclo("inexistente", { categoria: "str", estado: "pronta" })).toBe(false);
  });
});

describe("podeGerirEstadoOficina", () => {
  it("deixa a gestão mexer dentro do circuito da oficina", () => {
    expect(podeGerirEstadoOficina({ categoria: "str", estado: "pronta" })).toBe(true);
    expect(podeGerirEstadoOficina({ categoria: "str", estado: "classificada" })).toBe(true);
    expect(podeGerirEstadoOficina({ categoria: "str", estado: "manutencao" })).toBe(true);
  });

  it("não deixa tocar no que é do Watcher nem no movimento do pátio", () => {
    for (const estado of ["autorizada", "em_execucao", "em_aluguer", "retorno", "fechado", "entrada"]) {
      expect(podeGerirEstadoOficina({ categoria: "str", estado })).toBe(false);
    }
  });

  it("não deixa tocar em sucata, cujo estado é decidido pela categoria", () => {
    expect(podeGerirEstadoOficina({ categoria: "sucata", estado: "pronta" })).toBe(false);
  });
});

describe("normalizarEstadosIndefinidos", () => {
  it("corrige a sucata que ficou com estado de fluxo, em memória e na base de dados", async () => {
    const ciclos = [
      { id: "1", categoria: "sucata", estado: "classificada" },
      { id: "2", categoria: "str", estado: "pronta" },
    ];
    const saida = await normalizarEstadosIndefinidos(ciclos);
    expect(saida[0].estado).toBe("indefinido");
    expect(saida[1].estado).toBe("pronta");
    expect(registo.atualizados).toEqual([
      { entidade: "Ciclo", id: "1", dados: { estado: "indefinido" } },
    ]);
  });

  it("não grava nada quando já está tudo certo", async () => {
    await normalizarEstadosIndefinidos([{ id: "1", categoria: "str", estado: "pronta" }]);
    expect(registo.atualizados).toHaveLength(0);
  });

  it("uma gravação que falha não parte o ecrã — o estado derivado chega", async () => {
    base44.entities.Ciclo.update.mockRejectedValueOnce(new Error("sem rede"));
    const saida = await normalizarEstadosIndefinidos([{ id: "1", categoria: "sucata", estado: "pronta" }]);
    expect(saida[0].estado).toBe("indefinido");
  });
});

describe("o cone fica no pátio quando a máquina sai", () => {
  const c = (estado, extra = {}) => ({ id: "c1", categoria: "str", estado, cone_cor: "amarelo", cone_numero: "7", ...extra });

  it("uma máquina no pátio ocupa o seu cone", () => {
    for (const e of ["entrada", "classificada", "autorizada", "em_execucao", "pronta", "manutencao"]) {
      expect(cicloOcupaCone(c(e)), e).toBe(true);
      expect(temCone(c(e)), e).toBe(true);
    }
  });

  it("uma máquina alugada já não ocupa cone — é este o caso que faltava", () => {
    // O cone é um objeto físico: fica no chão do pátio e vai para outra máquina.
    expect(cicloOcupaCone(c("em_aluguer"))).toBe(false);
    expect(temCone(c("em_aluguer"))).toBe(false);
  });

  it("nem uma a caminho do retorno, nem uma vendida", () => {
    expect(temCone(c("retorno"))).toBe(false);
    expect(temCone(c("fechado"))).toBe(false);
  });

  it("um número gravado num ciclo que saiu não se mostra", () => {
    // Os registos antigos guardaram o número: não se apaga o passado, mas
    // também não se mostra um cone que já não está na máquina.
    const saiu = c("em_aluguer", { cone_numero: "42", cone_cor: "verde" });
    expect(saiu.cone_numero).toBe("42");
    expect(temCone(saiu)).toBe(false);
  });

  it("uma sucata continua no pátio e continua com o seu cone", () => {
    // O estado efetivo dela é "indefinido", mas ela está mesmo lá fora, e o
    // cone dela está ocupado.
    expect(cicloOcupaCone(c("classificada", { categoria: "sucata" }))).toBe(true);
  });

  it("sem cor ou sem número não há cone para mostrar, mesmo no pátio", () => {
    expect(temCone(c("pronta", { cone_cor: null }))).toBe(false);
    expect(temCone(c("pronta", { cone_numero: "" }))).toBe(false);
    expect(temCone(c("pronta", { cone_cor: "roxo-inventado" }))).toBe(false);
  });

  it("aguenta um ciclo em falta sem rebentar", () => {
    expect(temCone(null)).toBe(false);
    expect(temCone(undefined)).toBe(false);
    expect(temCone({})).toBe(false);
  });

  it("LIBERTAR_CONE limpa os dois campos, não só o número", () => {
    // Deixar a cor para trás dava uma máquina com cone de cor e sem número.
    expect(LIBERTAR_CONE).toEqual({ cone_cor: null, cone_numero: null });
  });
});
