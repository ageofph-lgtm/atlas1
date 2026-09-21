import { useState, useCallback } from "react";
import { LayoutGrid, Rows3, LayoutList, Table2, Grid2x2 } from "lucide-react";

/**
 * Modos de visualização das listas de máquinas.
 *
 * Os quatro modos compactos não repetem os botões do card: abrem o próprio
 * CicloCard quando se clica numa máquina. Assim editar, reservar, autorizar e
 * pedir continuam a existir num sítio só, em vez de quatro cópias que
 * divergiriam à primeira alteração.
 */
export const MODOS = [
  { key: "cards", label: "Cards", Icone: LayoutGrid, escala: true },
  { key: "grade", label: "Grade", Icone: Grid2x2, escala: true },
  { key: "mosaico", label: "Mosaico", Icone: LayoutList, escala: true },
  { key: "lista", label: "Lista", Icone: Rows3, escala: false },
  { key: "detalhe", label: "Detalhe", Icone: Table2, escala: false },
];

export const TAMANHOS = [
  { key: "pequeno", label: "Pequenos", sigla: "P" },
  { key: "medio", label: "Médios", sigla: "M" },
  { key: "grande", label: "Grandes", sigla: "G" },
];

export const MODO_PADRAO = "cards";
export const TAMANHO_PADRAO = "medio";
/** Sem ordenação escolhida, manda a ordem da página: prioridade e depois as mais antigas. */
export const ORDENACAO_PADRAO = null;

/** O tamanho só se aplica aos modos com ícone; lista e detalhe são sempre compactos. */
export const modoUsaEscala = (modo) => !!MODOS.find((m) => m.key === modo)?.escala;

// Nomes de classe completos: o Tailwind lê o código à procura deles, por isso
// construí-los com template strings não geraria nada.
export const GRELHA = {
  cards: {
    pequeno: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5",
    medio: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
    grande: "grid grid-cols-1 lg:grid-cols-2 gap-4",
  },
  grade: {
    pequeno: "grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2",
    medio: "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5",
    grande: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3",
  },
  mosaico: {
    pequeno: "grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2",
    medio: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5",
    grande: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
  },
};

/** Tamanho do cone por modo — é ele o "ícone" de uma máquina no pátio. */
export const CONE_TAMANHO = {
  grade: { pequeno: 30, medio: 46, grande: 64 },
  mosaico: { pequeno: 24, medio: 32, grande: 44 },
};

/** O número do cone acompanha o tamanho — é o que se lê de longe no pátio. */
export const CONE_NUM_CLASSE = { pequeno: "text-xs", medio: "text-base", grande: "text-xl" };

export const NS_CLASSE = {
  grade: { pequeno: "text-[11px]", medio: "text-sm", grande: "text-base" },
  mosaico: { pequeno: "text-xs", medio: "text-sm", grande: "text-base" },
};

const CHAVE = (pagina) => `atlas:vista:${pagina}`;

/** Só se aceita o que ainda existe: um valor gravado por uma versão antiga não pode partir o ecrã. */
export const validarPrefs = (guardado) => {
  if (!guardado || typeof guardado !== "object") return null;
  const ordenacao =
    guardado.ordenacao && typeof guardado.ordenacao === "object" && guardado.ordenacao.coluna
      ? { coluna: guardado.ordenacao.coluna, direcao: guardado.ordenacao.direcao === "desc" ? "desc" : "asc" }
      : ORDENACAO_PADRAO;
  return {
    modo: MODOS.some((m) => m.key === guardado.modo) ? guardado.modo : MODO_PADRAO,
    tamanho: TAMANHOS.some((t) => t.key === guardado.tamanho) ? guardado.tamanho : TAMANHO_PADRAO,
    ordenacao,
  };
};

const ler = (pagina) => {
  try {
    return validarPrefs(JSON.parse(localStorage.getItem(CHAVE(pagina)) || "null"));
  } catch (_e) {
    // janela privada, armazenamento bloqueado ou valor corrompido — vale o padrão
    return null;
  }
};

/**
 * Preferência de vista de cada pessoa, lembrada por página.
 *
 * Fica no browser de propósito: é uma comodidade de quem está a ver, não um
 * dado do pátio. Se o armazenamento não estiver disponível, a página funciona
 * na mesma — apenas não se lembra da escolha entre visitas.
 */
export function useViewPrefs(pagina) {
  const inicial = ler(pagina);
  const [modo, setModoState] = useState(inicial?.modo || MODO_PADRAO);
  const [tamanho, setTamanhoState] = useState(inicial?.tamanho || TAMANHO_PADRAO);
  const [ordenacao, setOrdenacaoState] = useState(inicial?.ordenacao ?? ORDENACAO_PADRAO);

  const guardar = useCallback((prefs) => {
    try {
      localStorage.setItem(CHAVE(pagina), JSON.stringify(prefs));
    } catch (_e) {
      // não poder guardar não pode impedir de mudar de vista
    }
  }, [pagina]);

  const setModo = useCallback((m) => { setModoState(m); guardar({ modo: m, tamanho, ordenacao }); }, [guardar, tamanho, ordenacao]);
  const setTamanho = useCallback((t) => { setTamanhoState(t); guardar({ modo, tamanho: t, ordenacao }); }, [guardar, modo, ordenacao]);
  const setOrdenacao = useCallback((o) => { setOrdenacaoState(o); guardar({ modo, tamanho, ordenacao: o }); }, [guardar, modo, tamanho]);

  return { modo, setModo, tamanho, setTamanho, ordenacao, setOrdenacao };
}
