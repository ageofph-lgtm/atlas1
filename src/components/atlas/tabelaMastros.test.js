import { describe, it, expect } from "vitest";
import {
  resolverH1, h3Disponiveis, montarTabela, calcularH1, h1DaMaquina, formatarH1, temElevacaoLivre150,
  TABELA_MASTROS, PROBLEMAS_DA_TABELA,
} from "@/components/atlas/tabelaMastros";

describe("resolverH1", () => {
  it("devolve o h1 da ficha quando o h3 existe (RX 20-16, triplex 4920 → 2160)", () => {
    expect(resolverH1({ modelo: "RX 20-16", mastro: "triplex", h3: "4920" }))
      .toMatchObject({ h1: 2160, h2: 1562, h4: 5538, origem: "tabela" });
  });

  it("aceita o modelo escrito de outra forma (RX20-16P, h3 com 'mm')", () => {
    expect(resolverH1({ modelo: "rx20-16p", mastro: "triplex", h3: "4920 mm" }).h1).toBe(2160);
  });

  it("o tipo de mastro muda o resultado para o mesmo h3 (RX 60-25, 4590)", () => {
    expect(resolverH1({ modelo: "RX 60-25", mastro: "niho", h3: 4590 }).h1).toBe(2925);
    expect(resolverH1({ modelo: "RX 60-25", mastro: "triplex", h3: 4590 }).h1).toBe(2175);
  });

  it("RX 20-20 tem h3 próprios (telescópico 2650 → 1910) e RX 20-18 NiHo começa em 2780", () => {
    expect(resolverH1({ modelo: "RX 20-20L", mastro: "telescopico", h3: 2650 }).h1).toBe(1910);
    expect(resolverH1({ modelo: "RX 20-18", mastro: "niho", h3: 2780 }).h1).toBe(1910);
  });

  it("FM-X: distingue 10 de 10 N no h4 mas o h1 é o mesmo", () => {
    expect(resolverH1({ modelo: "FM-X 10", mastro: "triplex", h3: 7000 })).toMatchObject({ h1: 2900, h4: 7560 });
    expect(resolverH1({ modelo: "FM-X 10 N", mastro: "triplex", h3: 7000 })).toMatchObject({ h1: 2900, h4: 7660 });
  });

  it("FM-X 25 a 12050 marca iGo indisponível (h3 > 10000)", () => {
    expect(resolverH1({ modelo: "FM-X 25", mastro: "triplex", h3: 12050 }))
      .toMatchObject({ h1: 4650, igoIndisponivel: true });
  });

  it("h3 entre dois valores da ficha → estimado e marcado", () => {
    const r = resolverH1({ modelo: "RX 20-16", mastro: "telescopico", h3: 3080 });
    expect(r).toMatchObject({ origem: "estimado", h1: 2110, entre: [2980, 3180] });
  });

  it("não extrapola fora da ficha", () => {
    expect(resolverH1({ modelo: "RX 20-16", mastro: "telescopico", h3: 6000 }))
      .toMatchObject({ h1: null, origem: "fora_da_tabela", intervalo: [2680, 5380] });
  });

  it("FM-X só tem triplex", () => {
    expect(resolverH1({ modelo: "FM-X 14", mastro: "telescopico", h3: 5000 }))
      .toMatchObject({ h1: null, origem: "tipo_indisponivel", tiposDisponiveis: ["triplex"] });
  });

  it("modelo fora das fichas carregadas e dados em falta", () => {
    expect(resolverH1({ modelo: "OPX 20", mastro: "triplex", h3: 4000 }).origem).toBe("modelo_desconhecido");
    expect(resolverH1({ modelo: "RX 20-16", mastro: "outro", h3: 4000 }).origem).toBe("dados_em_falta");
    expect(resolverH1({ modelo: "RX 20-16", mastro: "triplex", h3: "" }).origem).toBe("dados_em_falta");
  });
});

describe("resolverH1 — lote 2 (RX 60-35/50, EXV, EXV-SF)", () => {
  it("duplex é lido como telescópico", () => {
    expect(resolverH1({ modelo: "RX 20-16", mastro: "duplex", h3: 3180 }))
      .toMatchObject({ h1: 2160, origem: "tabela" });
  });

  it("aceita a designação comercial com Plus e Li-Ion", () => {
    expect(resolverH1({ modelo: "RX 60-35 (Plus)/600|Li-Ion", mastro: "triplex", h3: 5380 }).h1).toBe(2600);
    expect(resolverH1({ modelo: "EXV 14/Li-Ion", mastro: "niho", h3: 2844 }).h1).toBe(1915);
  });

  it("RX 60-50/600 tem h3 próprios para o mesmo h1 (telescópico 2780 → 2300)", () => {
    expect(resolverH1({ modelo: "RX 60-50/600", mastro: "telescopico", h3: 2780 }).h1).toBe(2300);
    expect(resolverH1({ modelo: "RX 60-50", mastro: "telescopico", h3: 2780 }).origem).toBe("fora_da_tabela");
  });

  it("EXV com (i) e versão D escritos como na ficha", () => {
    expect(resolverH1({ modelo: "EXV 12(i)C D", mastro: "triplex", h3: 4386 }).h1).toBe(1940);
    expect(resolverH1({ modelo: "EXV 16 D", mastro: "triplex", h3: 6066 }).h1).toBe(2515);
  });

  it("EXV 10C simplex existe; EXV 14 não tem simplex", () => {
    expect(resolverH1({ modelo: "EXV 10C", mastro: "simplex", h3: 1462 }).h1).toBe(1940);
    expect(resolverH1({ modelo: "EXV 14", mastro: "simplex", h3: 1462 }).origem).toBe("tipo_indisponivel");
  });

  it("EXV-SF 20 triplex 4026 → 1915", () => {
    expect(resolverH1({ modelo: "EXV-SF 20i", mastro: "triplex", h3: 4026 }).h1).toBe(1915);
  });
});

describe("elevação livre de 150 mm", () => {
  it("nos EXV telescópicos, a opção dá o H1 dessa versão (EXV 14, 2844: 1915 → 1990)", () => {
    expect(resolverH1({ modelo: "EXV 14", mastro: "telescopico", h3: 2844 }).h1).toBe(1915);
    expect(resolverH1({ modelo: "EXV 14", mastro: "telescopico", h3: 2844, elevacaoLivre150: true }))
      .toMatchObject({ h1: 1990, origem: "tabela", elevacaoLivre150: true });
  });

  it("também no estimado, entre as linhas dessa versão", () => {
    // 2594 fica a meio de 2344 e 2844: normal (1665+1915)/2, com EL150 (1740+1990)/2.
    expect(resolverH1({ modelo: "EXV 14", mastro: "telescopico", h3: 2594 }).h1).toBe(1790);
    expect(resolverH1({ modelo: "EXV 14", mastro: "telescopico", h3: 2594, elevacaoLivre150: true }).h1).toBe(1865);
  });

  it("onde a ficha não tem essa versão, a opção não se aplica e fica o H1 normal", () => {
    expect(resolverH1({ modelo: "RX 20-16", mastro: "telescopico", h3: 3180, elevacaoLivre150: true }))
      .toMatchObject({ h1: 2160, elevacaoLivre150: false });
  });

  it("só se pergunta onde existe", () => {
    expect(temElevacaoLivre150("EXV 14", "telescopico")).toBe(true);
    expect(temElevacaoLivre150("EXV 10C", "duplex")).toBe(true);
    expect(temElevacaoLivre150("EXV-SF 20i", "telescopico")).toBe(true);
    expect(temElevacaoLivre150("EXV 14", "triplex")).toBe(false);
    expect(temElevacaoLivre150("RX 20-16", "telescopico")).toBe(false);
    expect(temElevacaoLivre150("OPX 20", "telescopico")).toBe(false);
    expect(temElevacaoLivre150("EXV 14", "")).toBe(false);
  });
});

describe("h3Disponiveis", () => {
  it("lista os h3 da ficha para sugerir no formulário", () => {
    expect(h3Disponiveis("RX 20-14C", "niho")).toEqual([2860, 2960, 3160, 3360, 3560, 3960]);
  });

  it("sem modelo conhecido ou sem mastro, não sugere nada", () => {
    expect(h3Disponiveis("OPX 20", "triplex")).toEqual([]);
    expect(h3Disponiveis("RX 20-16", "")).toEqual([]);
  });
});

describe("as fichas carregadas", () => {
  const todas = Object.values(TABELA_MASTROS).flatMap((e) =>
    Object.entries(e.tipos).map(([tipo, linhas]) => ({ modelo: e.modelo, tipo, linhas }))
  );

  it("os lotes 1 e 2 estão lá: 79 modelos", () => {
    expect(Object.keys(TABELA_MASTROS)).toHaveLength(79);
  });

  it("os lotes não se contradizem e todos os tipos de mastro são conhecidos", () => {
    // Se isto falhar depois de juntar um lote novo, a mensagem diz que modelo,
    // tipo e H3 têm dois H1 diferentes: é essa linha que se confirma na ficha.
    expect(PROBLEMAS_DA_TABELA.conflitos).toEqual([]);
    expect(PROBLEMAS_DA_TABELA.tiposDesconhecidos).toEqual([]);
  });

  it("em cada linha, recolhido < aberto: h1 < h3 < h4", () => {
    // O simplex não estica: a altura de elevação fica abaixo da do mastro
    // (EXV 10C: h3 662, h1 1140), por isso a regra não se lhe aplica.
    const erradas = todas.filter(({ tipo }) => tipo !== "simplex").flatMap(({ modelo, tipo, linhas }) =>
      linhas.filter((l) => !(l.h1 < l.h3 && l.h3 < l.h4)).map((l) => `${modelo} ${tipo} h3 ${l.h3}`)
    );
    expect(erradas).toEqual([]);
  });

  it("a elevação livre de 150 mm vem em todas as linhas da tabela ou em nenhuma", () => {
    // Com uma linha em falta, a opção deixava de aparecer para esse modelo.
    const partidas = todas
      .filter(({ linhas }) => linhas.some((l) => l.h1El150 !== null) && !linhas.every((l) => l.h1El150 !== null))
      .map(({ modelo, tipo }) => `${modelo} ${tipo}`);
    expect(partidas).toEqual([]);
  });

  it("num mesmo modelo e tipo, um mastro mais alto não fica mais baixo recolhido", () => {
    // Apanha erros de transcrição: um H1 trocado entre linhas quebra a subida.
    const erradas = todas.flatMap(({ modelo, tipo, linhas }) =>
      linhas.slice(1).filter((l, i) => l.h1 < linhas[i].h1).map((l) => `${modelo} ${tipo} h3 ${l.h3}`)
    );
    expect(erradas).toEqual([]);
  });
});

describe("montarTabela — juntar lotes", () => {
  const linha = (extra) => ({
    modelos_aplicaveis: ["RX 20-16"], tipo_mastro: "Triplex", h3: 4920, h1: 2160, h2: 1562, h4: 5538,
    nao_disponivel_igo: false, fonte: "ficha A", ...extra,
  });

  it("a mesma linha em dois lotes entra uma vez", () => {
    const { tabela, conflitos } = montarTabela([{ linhas: [linha()] }, { linhas: [linha({ fonte: "ficha B" })] }]);
    expect(tabela.RX2016.tipos.triplex).toHaveLength(1);
    expect(conflitos).toEqual([]);
  });

  it("o mesmo h3 com h1 diferente é conflito, e fica o primeiro", () => {
    const { tabela, conflitos } = montarTabela([{ linhas: [linha()] }, { linhas: [linha({ h1: 2170 })] }]);
    expect(tabela.RX2016.tipos.triplex[0].h1).toBe(2160);
    expect(conflitos).toHaveLength(1);
    expect(conflitos[0]).toMatchObject({ tipo: "triplex", h3: 4920 });
  });

  it("ordena por h3 mesmo que o lote venha desordenado, e aceita HiLo como NiHo", () => {
    const { tabela } = montarTabela([{ linhas: [
      linha({ tipo_mastro: "HiLo", h3: 3500, h1: 2400, h4: 4000 }),
      linha({ tipo_mastro: "HiLo", h3: 3000, h1: 2150, h4: 3500 }),
    ] }]);
    expect(tabela.RX2016.tipos.niho.map((l) => l.h3)).toEqual([3000, 3500]);
  });

  it("um tipo de mastro que a aplicação não conhece fica registado, não entra", () => {
    const { tabela, tiposDesconhecidos } = montarTabela([{ linhas: [linha({ tipo_mastro: "Quadruplex" })] }]);
    expect(tabela.RX2016).toBeUndefined();
    expect(tiposDesconhecidos).toEqual(["Quadruplex"]);
  });
});

describe("calcularH1 — o que se grava", () => {
  it("valor da ficha", () => {
    expect(calcularH1({ modelo: "RX 20-16", mastro: "triplex", h3: "4920" }))
      .toEqual({ h1: "2160", h1_origem: "tabela", elevacao_livre_150: false });
  });

  it("valor estimado fica marcado", () => {
    expect(calcularH1({ modelo: "RX 20-16", mastro: "telescopico", h3: "3080" }))
      .toEqual({ h1: "2110", h1_origem: "estimado", elevacao_livre_150: false });
  });

  it("sem resposta da tabela grava em branco — um H1 antigo deixaria de ser desta máquina", () => {
    expect(calcularH1({ modelo: "OPX 20", mastro: "triplex", h3: "4000" })).toMatchObject({ h1: "", h1_origem: "" });
    expect(calcularH1({ modelo: "RX 20-16", mastro: "", h3: "" })).toMatchObject({ h1: "", h1_origem: "" });
  });

  it("grava a elevação livre de 150 mm com o H1 dessa versão", () => {
    expect(calcularH1({ modelo: "EXV 14", mastro: "telescopico", h3: "2844", elevacaoLivre150: true }))
      .toEqual({ h1: "1990", h1_origem: "tabela", elevacao_livre_150: true });
  });

  it("a elevação livre cai quando deixa de se aplicar (mastro trocado para triplex)", () => {
    expect(calcularH1({ modelo: "EXV 14", mastro: "triplex", h3: "4386", elevacaoLivre150: true }))
      .toMatchObject({ elevacao_livre_150: false });
  });

  it("guarda a elevação livre mesmo sem H3 ainda, porque é uma característica da máquina", () => {
    expect(calcularH1({ modelo: "EXV 14", mastro: "telescopico", h3: "", elevacaoLivre150: true }))
      .toEqual({ h1: "", h1_origem: "", elevacao_livre_150: true });
  });
});

describe("h1DaMaquina — o que se mostra", () => {
  it("prefere o gravado", () => {
    expect(h1DaMaquina({ modelo: "RX 20-16", mastro: "triplex", h3: "4920", h1: "2110", h1_origem: "estimado" }))
      .toEqual({ h1: 2110, origem: "estimado" });
  });

  it("máquina registada antes das tabelas: calcula na hora", () => {
    expect(h1DaMaquina({ modelo: "RX 20-16", mastro: "triplex", h3: "4920" })).toEqual({ h1: 2160, origem: "tabela" });
    expect(h1DaMaquina({ modelo: "EXV 14", mastro: "telescopico", h3: "2844", elevacao_livre_150: true }))
      .toEqual({ h1: 1990, origem: "tabela" });
  });

  it("sem H1 possível, nada", () => {
    expect(h1DaMaquina({ modelo: "OPX 20", mastro: "triplex", h3: "4000" })).toBe(null);
    expect(h1DaMaquina(null)).toBe(null);
  });

  it("formata com ≈ quando é estimado", () => {
    expect(formatarH1({ h1: 2160, origem: "tabela" })).toBe("2160mm");
    expect(formatarH1({ h1: 2110, origem: "estimado" })).toBe("≈2110mm");
    expect(formatarH1(null)).toBe(null);
  });
});
