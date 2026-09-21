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

export const COLUNAS_ORDENAVEIS = [
  { chave: "cone", label: "Cone", tipo: "numero", valor: (c) => c.cone_numero },
  { chave: "serie", label: "Série", tipo: "texto", valor: (c) => c.serie },
  { chave: "modelo", label: "Modelo", tipo: "texto", valor: (c, m) => m?.modelo },
  { chave: "categoria", label: "Categoria", tipo: "texto", valor: (c) => CATEGORIA_CONFIG[c.categoria]?.label || c.categoria },
  { chave: "estado", label: "Estado", tipo: "texto", valor: (c) => ESTADO_CONFIG[estadoEfetivo(c)]?.label || estadoEfetivo(c) },
  { chave: "cliente", label: "Cliente", tipo: "texto", valor: (c) => c.reserva_cliente },
  { chave: "entrada", label: "Entrada", tipo: "data", valor: (c) => c.data_entrada },
];

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
  const col = COLUNAS_ORDENAVEIS.find((c) => c.chave === ordenacao?.coluna);
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
