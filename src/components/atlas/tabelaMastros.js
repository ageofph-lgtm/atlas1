/**
 * Tabelas de mastros: do H3, que se lê na placa, ao H1, que só vinha do sistema.
 *
 * O H3 é a altura do mastro todo aberto e o H1 a do mastro recolhido. Para um
 * modelo e um tipo de mastro, cada H3 só pode ter um H1 — é limitação física —,
 * e as fichas técnicas STILL (VDI 2198, página "Tabela de mastros") dão os
 * pares. Com elas, quem regista no pátio fica com o H1 sem ir ao sistema.
 *
 * As fichas estão transcritas em JSON, por lotes, na pasta `mastros/`. Um lote
 * novo é mais um ficheiro `tabela_mastros_*.json` nessa pasta: entra sozinho,
 * sem mexer neste código. Os testes verificam que os lotes não se contradizem.
 */

const LOTES = Object.values(
  import.meta.glob("./mastros/tabela_mastros_*.json", { eager: true, import: "default" })
);

/** "RX 20-16P", "rx20-16p" e "RX 20 16 P" são o mesmo modelo. */
export const normalizarModelo = (modelo) => String(modelo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// Os nomes das fichas e os da aplicação. A STILL chama NiHo ao mastro HiLo.
// "duplex" fica de fora de propósito: tanto o telescópico como o HiLo são
// mastros de 2 estágios, por isso "duplex" não diz qual das duas tabelas usar.
const TIPOS_ALIAS = { hilo: "niho", niho: "niho", triplex: "triplex", telescopico: "telescopico", "telescópico": "telescopico" };
const tipoDe = (mastro) => TIPOS_ALIAS[String(mastro || "").trim().toLowerCase()];

/**
 * Junta os lotes numa tabela por modelo e tipo de mastro, com as linhas
 * ordenadas por H3.
 *
 * O mesmo modelo pode vir em mais do que um bloco da ficha (ou em mais do que
 * um lote). Linhas repetidas juntam-se; um mesmo H3 com H1 diferente é um
 * conflito, e fica a primeira — os testes falham enquanto houver algum.
 */
export function montarTabela(lotes) {
  const tabela = {};
  const conflitos = [];
  const tiposDesconhecidos = new Set();

  for (const lote of lotes) {
    for (const l of lote?.linhas || []) {
      const tipo = tipoDe(l.tipo_mastro);
      if (!tipo) {
        tiposDesconhecidos.add(l.tipo_mastro);
        continue;
      }
      const linha = { h3: l.h3, h1: l.h1, h2: l.h2, h4: l.h4, fonte: l.fonte, igoIndisponivel: !!l.nao_disponivel_igo };
      for (const modelo of l.modelos_aplicaveis || []) {
        const chave = normalizarModelo(modelo);
        const entrada = (tabela[chave] ||= { modelo, tipos: {} });
        const linhas = (entrada.tipos[tipo] ||= []);
        const mesma = linhas.find((x) => x.h3 === linha.h3);
        if (!mesma) {
          linhas.push(linha);
        } else if (mesma.h1 !== linha.h1 || mesma.h2 !== linha.h2 || mesma.h4 !== linha.h4) {
          conflitos.push({ modelo, tipo, h3: linha.h3, fica: mesma, ignorada: linha });
        }
      }
    }
  }

  for (const entrada of Object.values(tabela)) {
    for (const linhas of Object.values(entrada.tipos)) linhas.sort((a, b) => a.h3 - b.h3);
  }
  return { tabela, conflitos, tiposDesconhecidos: [...tiposDesconhecidos] };
}

const MONTADA = montarTabela(LOTES);
export const TABELA_MASTROS = MONTADA.tabela;
export const PROBLEMAS_DA_TABELA = { conflitos: MONTADA.conflitos, tiposDesconhecidos: MONTADA.tiposDesconhecidos };

/**
 * Resolve o H1 a partir de modelo + tipo de mastro + H3.
 *
 * O tipo é obrigatório: no mesmo modelo o mesmo H3 aparece em tipos diferentes
 * com H1 muito diferente (RX 60-25, H3 4590: HiLo 2925, Triplex 2175), e há H3
 * de tipos diferentes a 20 mm uns dos outros. Por isso não há tolerância na
 * procura: ou o H3 existe na ficha, ou é estimado e fica marcado como tal.
 *
 * Devolve sempre um objeto com `origem`:
 *  - "tabela":   o H3 existe na ficha; H1/H2/H4 são os valores oficiais
 *  - "estimado": o H3 fica entre dois valores da ficha; H1 interpolado
 *  - "modelo_desconhecido" | "tipo_indisponivel" | "fora_da_tabela" | "dados_em_falta": h1 = null
 */
export function resolverH1({ modelo, mastro, h3 }, tabela = TABELA_MASTROS) {
  const valorH3 = Number(String(h3 ?? "").replace(/[^\d]/g, ""));
  const tipo = tipoDe(mastro);
  if (!modelo || !tipo || !valorH3) return { h1: null, origem: "dados_em_falta" };

  const entrada = tabela[normalizarModelo(modelo)];
  if (!entrada) return { h1: null, origem: "modelo_desconhecido" };

  const linhas = entrada.tipos[tipo];
  if (!linhas) {
    return { h1: null, origem: "tipo_indisponivel", tiposDisponiveis: Object.keys(entrada.tipos) };
  }

  const exata = linhas.find((l) => l.h3 === valorH3);
  if (exata) {
    const { h1, h2, h4, fonte, igoIndisponivel } = exata;
    return { h1, h2, h4, origem: "tabela", fonte, igoIndisponivel };
  }

  const i = linhas.findIndex((l) => l.h3 > valorH3);
  if (i <= 0) {
    // Abaixo do primeiro ou acima do último: não se extrapola, porque fora da
    // ficha pode ser um mastro especial ou um H3 mal lido na placa.
    return { h1: null, origem: "fora_da_tabela", intervalo: [linhas[0].h3, linhas[linhas.length - 1].h3] };
  }
  const [a, b] = [linhas[i - 1], linhas[i]];
  const h1 = Math.round(a.h1 + ((valorH3 - a.h3) * (b.h1 - a.h1)) / (b.h3 - a.h3));
  return { h1, origem: "estimado", entre: [a.h3, b.h3], fonte: a.fonte };
}

/** H3 válidos para o modelo/tipo — para sugerir no formulário. */
export function h3Disponiveis(modelo, mastro, tabela = TABELA_MASTROS) {
  const linhas = tabela[normalizarModelo(modelo)]?.tipos?.[tipoDe(mastro)];
  return linhas ? linhas.map((l) => l.h3) : [];
}

/**
 * O que se grava na Maquina.
 *
 * O H1 é sempre recalculado a partir de modelo + mastro + H3 e nunca se
 * escreve à mão: se o H3 mudar e deixar de dar H1, o antigo apaga-se, porque
 * já não seria o desta máquina.
 */
export function calcularH1({ modelo, mastro, h3 }) {
  const r = resolverH1({ modelo, mastro, h3 });
  if (r.h1 === null) return { h1: "", h1_origem: "" };
  return { h1: String(r.h1), h1_origem: r.origem };
}

/**
 * O H1 a mostrar: o gravado, ou — nas máquinas registadas antes de haver
 * tabelas — o que a tabela dá hoje. `null` quando não há nenhum.
 */
export function h1DaMaquina(maquina) {
  if (!maquina) return null;
  if (maquina.h1) return { h1: Number(maquina.h1), origem: maquina.h1_origem || "tabela" };
  const r = resolverH1(maquina);
  return r.h1 === null ? null : { h1: r.h1, origem: r.origem };
}

/** "2160mm", ou "≈2110mm" quando é estimado. */
export const formatarH1 = (r) => (r ? `${r.origem === "estimado" ? "≈" : ""}${r.h1}mm` : null);
