import { base44 } from "@/api/base44Client";
import { CATEGORIA_CONE_MAP } from "@/components/atlas/constants";

const ACTIVE_ESTADOS = ["entrada", "classificada", "autorizada", "em_execucao", "pronta", "manutencao"];

export async function validateConeNumber(categoria, numero, excludeCicloId) {
  const coneCor = CATEGORIA_CONE_MAP[categoria];
  if (!coneCor || !numero) return { free: true };

  const results = await base44.entities.Ciclo.filter({ cone_cor: coneCor });
  const conflict = results.find(
    (c) => ACTIVE_ESTADOS.includes(c.estado) && String(c.cone_numero) === String(numero) && c.id !== excludeCicloId
  );

  return conflict ? { free: false, conflito: conflict } : { free: true };
}