import { ESTADO_CONFIG, CATEGORIA_CONFIG } from "@/components/atlas/constants";
import { estadoEfetivo } from "@/components/atlas/cicloUtils";

/**
 * Ordenação das colunas do modo Detalhe.
 *
 * Três regras que uma ordenação ingénua erra:
 *  - o número do cone é número, senão o 10 vinha antes do 9;
 *  - o texto compara-se em português, senão "Águia" ia parar depois de "Zebra";
 *  - o que está vazio fica sempre no fim, nas duas direções — quem ordena por
 *    cliente quer ver os clientes, não uma página de traços.
 */

/**
 * Por onde se pode organizar uma lista de máquinas.
 *
 * `coluna: true` marca as que também são cabeçalhos da tabela no modo Detalhe.
 * As restantes só existem no organizador — não fazia sentido pôr mais três
 * colunas na tabela só para se poder ordenar por elas.
 */
export const CAMPOS_ORDENACAO = [
  { chave: "cone", label: "Cone", tipo: "numero", coluna: true, valor: (c) => c.cone_numero },
  { chave: "serie", label: "Série", tipo: "texto", coluna: true, valor: (c) => c.serie },
  { chave: "modelo", label: "Modelo", tipo: "texto", coluna: true, valor: (c, m) => m?.modelo },
  { chave: "categoria", label: "Categoria", tipo: "texto", coluna: true, valor: (c) => CATEGORIA_CONFIG[c.categoria]?.label || c.categoria },
  { chave: "estado", label: "Estado", tipo: "texto", coluna: true, valor: (c) => ESTADO_CONFIG[estadoEfetivo(c)]?.label || estadoEfetivo(c) },
  { chave: "cliente", label: "Cliente", tipo: "texto", coluna: true, valor: (c) => c.reserva_cliente },
  { chave: "entrada", label: "Entrada", tipo: "data", coluna: true, valor: (c) => c.data_entrada },
  // Data em que o registo foi criado — não é o mesmo que a entrada no pátio:
  // uma máquina pode ser registada dias depois de chegar.
  { chave: "registo", label: "Data de registo", tipo: "data", valor: (c) => c.created_date },
  // Última vez que alguém lhe mexeu. É o que se quer para ver o que mudou hoje.
  { chave: "alteracao", label: "Última alteração", tipo: "data", valor: (c) => c.updated_date || c.created_date },
  { chave: "ano", label: "Ano da máquina", tipo: "numero", valor: (c, m) => m?.ano },
  { chave: "pronta", label: "Data pronta", tipo: "data", valor: (c) => c.data_pronta },
];

/** As que aparecem como cabeçalho na tabela do modo Detalhe. */
export const COLUNAS_ORDENAVEIS = CAMPOS_ORDENACAO.filter((c) => c.coluna);

const vazio = (v) => v === null || v === undefined || String(v).trim() === "";

const comparar = {
  numero: (a, b) => Number(a) - Number(b),
  data: (a, b) => new Date(a) - new Date(b),
  texto: (a, b) => String(a).localeCompare(String(b), "pt", { sensitivity: "base", numeric: true }),
};

/**
 * Ordena uma cópia. Sem coluna escolhida devolve a lista como veio — a ordem
 * que a página já tinha (prioridade primeiro, depois as mais antigas) não se
 * mexe até alguém carregar num cabeçalho.
 */
export function ordenarCiclos(ciclos, ordenacao, getMaquina = () => null) {
  const col = CAMPOS_ORDENACAO.find((c) => c.chave === ordenacao?.coluna);
  if (!col) return ciclos;

  const sinal = ordenacao.direcao === "desc" ? -1 : 1;
  return [...ciclos].sort((x, y) => {
    const a = col.valor(x, getMaquina(x));
    const b = col.valor(y, getMaquina(y));
    // Os vazios não entram na comparação: vão para o fim, seja qual for a direção.
    if (vazio(a) && vazio(b)) return 0;
    if (vazio(a)) return 1;
    if (vazio(b)) return -1;
    return sinal * comparar[col.tipo](a, b);
  });
}

/** Clicar na mesma coluna inverte; noutra começa do princípio, ascendente. */
export const proximaOrdenacao = (atual, coluna) =>
  atual?.coluna === coluna && atual?.direcao === "asc"
    ? { coluna, direcao: "desc" }
    : { coluna, direcao: "asc" };
