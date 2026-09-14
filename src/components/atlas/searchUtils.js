// Tokenized, case-insensitive search across ciclo + maquina fields.
// Shared by Inventário and Saída.
export const matchCicloSearch = (ciclo, maquina, query) => {
  if (!query || !query.trim()) return true;
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const fields = [
    ciclo?.serie, ciclo?.categoria, ciclo?.cone_cor, ciclo?.cone_numero, ciclo?.reserva_cliente,
    maquina?.modelo, maquina?.ano, maquina?.mastro, maquina?.vias_mastro,
    maquina?.joystick, maquina?.tipo_pneu, maquina?.h3, maquina?.bateria, ...(maquina?.acessorios || []),
  ].filter(Boolean).map((f) => String(f).toLowerCase());
  return tokens.every((token) => fields.some((f) => f.includes(token)));
};