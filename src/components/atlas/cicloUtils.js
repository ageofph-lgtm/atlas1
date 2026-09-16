import { base44 } from "@/api/base44Client";
import {
  CATEGORIAS_SEM_ESTADO,
  ESTADOS_TERMINAIS,
  MODELO_FAMILIAS,
  MODELO_FAMILIA_OUTRAS,
} from "@/components/atlas/constants";

export const isCategoriaSemEstado = (categoria) => CATEGORIAS_SEM_ESTADO.includes(categoria);

/**
 * Estado a usar em todo o lado (badges, abas, filtros).
 * Sucata e indefinida não seguem o fluxo de preparação: ficam em "indefinido",
 * por isso nunca aparecem em POR FAZER / PRONTAS. Estados terminais
 * (em aluguer, retorno, fechado) são factos do ciclo e mantêm-se.
 */
export const estadoEfetivo = (ciclo) => {
  if (!ciclo) return null;
  if (isCategoriaSemEstado(ciclo.categoria) && !ESTADOS_TERMINAIS.includes(ciclo.estado)) {
    return "indefinido";
  }
  return ciclo.estado;
};

/** Modelo normalizado para comparação: maiúsculas, só letras e dígitos. */
const normalizeModelo = (modelo) => String(modelo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Família de modelo a que a máquina pertence, ou "outras" se não corresponder a nenhuma. */
export const familiaDoModelo = (modelo) => {
  const norm = normalizeModelo(modelo);
  if (!norm) return MODELO_FAMILIA_OUTRAS.value;
  const familia = MODELO_FAMILIAS.find((f) => f.match.some((m) => norm.includes(m)));
  return familia ? familia.value : MODELO_FAMILIA_OUTRAS.value;
};

/**
 * OR entre as famílias selecionadas (lista vazia = sem filtro),
 * para combinar com os restantes filtros em AND.
 */
export const matchModeloFamilia = (maquina, familias) => {
  if (!familias || familias.length === 0) return true;
  return familias.includes(familiaDoModelo(maquina?.modelo));
};

/**
 * Migração suave: tira o estado de fluxo às máquinas já registadas como
 * sucata/indefinida, gravando "indefinido". Falha em silêncio — a UI já usa
 * estadoEfetivo(), portanto o ecrã fica correto mesmo que a gravação não passe.
 * Devolve os ciclos com o estado corrigido em memória.
 */
export const normalizarEstadosIndefinidos = async (ciclos) => {
  const pendentes = ciclos.filter((c) => estadoEfetivo(c) === "indefinido" && c.estado !== "indefinido");
  if (pendentes.length === 0) return ciclos;

  await Promise.all(
    pendentes.map((c) =>
      base44.entities.Ciclo.update(c.id, { estado: "indefinido" }).catch(() => {
        // ignorado — o estado derivado mantém o ecrã correto
      })
    )
  );

  const corrigidos = new Set(pendentes.map((c) => c.id));
  return ciclos.map((c) => (corrigidos.has(c.id) ? { ...c, estado: "indefinido" } : c));
};

/** Estado inicial dos filtros partilhado pelas páginas com FilterBar. */
export const FILTROS_VAZIOS = {
  categoria: "all",
  estado: "all",
  mastro: "all",
  vias_mastro: "all",
  tipo_pneu: "all",
  coneCor: "all",
  coneNumero: "",
  modelos: [],
};

const FILTROS_SELECT = ["categoria", "estado", "mastro", "vias_mastro", "tipo_pneu", "coneCor"];

/** True quando o utilizador restringiu alguma coisa (usado para "Limpar filtros"). */
export const hasFiltrosAtivos = (filters = {}) =>
  FILTROS_SELECT.some((k) => filters[k] && filters[k] !== "all") ||
  !!(filters.coneNumero || "").trim() ||
  (filters.modelos?.length || 0) > 0;

/**
 * Filtros da FilterBar aplicados a um par ciclo/máquina — partilhado pelo
 * inventário, autorização e saída para não divergirem.
 */
export const passesCicloFilters = (ciclo, maquina, filters = {}) => {
  const ativo = (key) => filters[key] && filters[key] !== "all";
  if (ativo("categoria") && ciclo?.categoria !== filters.categoria) return false;
  if (ativo("estado") && estadoEfetivo(ciclo) !== filters.estado) return false;
  if (ativo("mastro") && maquina?.mastro !== filters.mastro) return false;
  if (ativo("vias_mastro") && maquina?.vias_mastro !== filters.vias_mastro) return false;
  if (ativo("tipo_pneu") && maquina?.tipo_pneu !== filters.tipo_pneu) return false;
  // Cone — match exacto em (cor + nº), para os dígitos não apanharem séries.
  if (ativo("coneCor") && ciclo?.cone_cor !== filters.coneCor) return false;
  const coneNum = (filters.coneNumero || "").trim();
  if (coneNum && String(ciclo?.cone_numero ?? "") !== coneNum) return false;
  if (!matchModeloFamilia(maquina, filters.modelos)) return false;
  return true;
};

// Estados em que a máquina está fora do pátio mas o ciclo continua aberto.
// Um ciclo só está mesmo encerrado quando fica "fechado".
export const ESTADOS_FORA_DO_PATIO = ["em_aluguer", "retorno"];

const maisRecente = (campo) => (a, b) => new Date(b[campo] || b.created_date) - new Date(a[campo] || a.created_date);

/**
 * Separa os ciclos por fechar de uma série em dois casos, que pedem respostas
 * diferentes na entrada:
 *  - noPatio → a máquina nunca saiu; registá-la outra vez seria duplicá-la.
 *  - fora    → saiu para aluguer e está a voltar; o ciclo tem de ser fechado
 *              como retorno antes de abrir o novo.
 */
export const classificarCiclosAbertos = (ciclos = []) => {
  const abertos = ciclos.filter((c) => c.estado !== "fechado");
  const fora = abertos.filter((c) => ESTADOS_FORA_DO_PATIO.includes(c.estado));
  const noPatio = abertos.filter((c) => !ESTADOS_FORA_DO_PATIO.includes(c.estado));
  return {
    noPatio: [...noPatio].sort(maisRecente("data_entrada"))[0] || null,
    fora: [...fora].sort(maisRecente("data_saida"))[0] || null,
  };
};
