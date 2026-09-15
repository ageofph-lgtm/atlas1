import { SPEC_LABELS, CATEGORIA_CONFIG } from "@/components/atlas/constants";

// Tokenized, case-insensitive search across ciclo + maquina fields.
// OR logic: any token matches any field — easy to find by any term
// (serie, modelo, triplex, niho, cliente, ...).
// Cone NUMBER is NOT searched here (use the dedicated cone filter for that,
// so digits don't broadly match series/ano/etc.).
export const matchCicloSearch = (ciclo, maquina, query) => {
  if (!query || !query.trim()) return true;
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const labelOf = (field, value) => (value ? (SPEC_LABELS[field]?.[value] || "") : "");
  const catLabel = ciclo?.categoria ? (CATEGORIA_CONFIG[ciclo.categoria]?.label || "") : "";

  const fields = [
    ciclo?.serie,
    ciclo?.categoria,
    catLabel,
    ciclo?.cone_cor,
    ciclo?.reserva_cliente,
    ciclo?.observacoes,
    maquina?.modelo,
    maquina?.observacoes,
    maquina?.ano,
    maquina?.mastro,
    labelOf("mastro", maquina?.mastro),
    maquina?.vias_mastro,
    labelOf("vias_mastro", maquina?.vias_mastro),
    maquina?.joystick,
    labelOf("joystick", maquina?.joystick),
    maquina?.tipo_pneu,
    labelOf("tipo_pneu", maquina?.tipo_pneu),
    maquina?.h3,
    maquina?.bateria,
    labelOf("bateria", maquina?.bateria),
    ...(maquina?.acessorios || []).flatMap((a) => [a, SPEC_LABELS.acessorios?.[a] || ""]),
  ]
    .filter((f) => f !== "" && f != null)
    .map((f) => String(f).toLowerCase());

  return tokens.some((token) => fields.some((f) => f.includes(token)));
};