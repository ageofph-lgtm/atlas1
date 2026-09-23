import { ESTADO_CONFIG, CATEGORIA_CONFIG, CONE_COLORS, SPEC_LABELS } from "@/components/atlas/constants";
import { estadoEfetivo } from "@/components/atlas/cicloUtils";

/**
 * Exportação das máquinas para Excel.
 *
 * As colunas são o que se vê no programa — série, modelo, estado, cliente,
 * datas — mais as quatro especificações que decidem se uma máquina serve um
 * cliente: H3, horímetro, bateria e joystick. São as que se perguntam ao
 * telefone antes de prometer uma máquina.
 *
 * Continuam de fora o mastro, as vias, os pneus e os acessórios: quem abre a
 * folha quer saber o que está no pátio, não a ficha técnica completa de cada
 * máquina.
 *
 * As datas saem como datas e os números como números, para o Excel poder
 * ordenar e filtrar a sério em vez de tratar tudo como texto.
 */

const rotuloEstado = (ciclo) => ESTADO_CONFIG[estadoEfetivo(ciclo)]?.label || estadoEfetivo(ciclo) || "";
const rotuloCategoria = (ciclo) => CATEGORIA_CONFIG[ciclo?.categoria]?.label || ciclo?.categoria || "";
const rotuloConeCor = (ciclo) => CONE_COLORS.find((c) => c.value === ciclo?.cone_cor)?.label || ciclo?.cone_cor || "";

const data = (valor) => (valor ? new Date(valor) : null);
const numero = (valor) => {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
};

export const COLUNAS = [
  { label: "Cone (cor)", largura: 12, valor: (c) => rotuloConeCor(c) },
  { label: "Cone nº", largura: 9, valor: (c) => numero(c.cone_numero) },
  { label: "Série", largura: 20, valor: (c) => c.serie || "" },
  { label: "Modelo", largura: 16, valor: (c, m) => m?.modelo || "" },
  // Número, não texto: quem filtra por altura quer "maior que 4000", e com
  // texto o Excel ordenaria 10000 antes de 4455.
  { label: "H3 (mm)", largura: 10, valor: (c, m) => numero(m?.h3) },
  { label: "Horímetro (h)", largura: 13, valor: (c, m) => numero(m?.horimetro) },
  { label: "Bateria", largura: 11, valor: (c, m) => (m?.bateria ? SPEC_LABELS.bateria?.[m.bateria] || m.bateria : "") },
  { label: "Joystick", largura: 12, valor: (c, m) => (m?.joystick ? SPEC_LABELS.joystick?.[m.joystick] || m.joystick : "") },
  { label: "Categoria", largura: 13, valor: (c) => rotuloCategoria(c) },
  { label: "Estado", largura: 15, valor: (c) => rotuloEstado(c) },
  { label: "Prioridade", largura: 11, valor: (c) => (c.prioridade ? "Sim" : "") },
  { label: "Cliente", largura: 24, valor: (c) => c.reserva_cliente || "" },
  { label: "Comercial", largura: 18, valor: (c) => c.reserva_comercial || "" },
  { label: "Entrada", largura: 12, valor: (c) => data(c.data_entrada) },
  { label: "Pronta", largura: 12, valor: (c) => data(c.data_pronta) },
  { label: "Saída", largura: 12, valor: (c) => data(c.data_saida) },
  { label: "Tipo de saída", largura: 13, valor: (c) => (c.tipo_saida === "vendida" ? "Venda" : c.tipo_saida ? "Aluguer" : "") },
  { label: "Dias alugada", largura: 12, valor: (c) => numero(c.dias_alugada) },
];

/** Linhas prontas a escrever — separado da escrita para poder ser testado sem o Excel. */
export const construirLinhas = (ciclos, getMaquina = () => null) =>
  ciclos.map((c) => {
    const m = getMaquina(c);
    const linha = {};
    COLUNAS.forEach((col) => { linha[col.label] = col.valor(c, m); });
    return linha;
  });

export const nomeFicheiro = (pagina, hoje = new Date()) =>
  `atlas-${pagina}-${hoje.toISOString().slice(0, 10)}.xlsx`;

/**
 * Escreve e descarrega o ficheiro.
 *
 * O SheetJS entra por importação dinâmica: são umas centenas de KB que só
 * fazem falta a quem carrega no botão, e assim o arranque da aplicação fica
 * como estava.
 */
export async function exportarCiclos(ciclos, { getMaquina, pagina = "inventario" } = {}) {
  if (!ciclos?.length) return { ok: false, erro: "Não há nada para exportar." };

  const XLSX = await import("xlsx");
  const linhas = construirLinhas(ciclos, getMaquina);
  const folha = XLSX.utils.json_to_sheet(linhas, {
    header: COLUNAS.map((c) => c.label),
    cellDates: true,
  });

  folha["!cols"] = COLUNAS.map((c) => ({ wch: c.largura }));
  // Cabeçalho sempre à vista e com filtro, que é como se usa uma folha destas.
  folha["!freeze"] = { xSplit: 0, ySplit: 1 };
  folha["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: COLUNAS.length - 1, r: linhas.length } }) };

  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, folha, "Máquinas");
  XLSX.writeFile(livro, nomeFicheiro(pagina), { compression: true });

  return { ok: true, linhas: linhas.length };
}
