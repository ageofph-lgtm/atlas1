import { base44 } from "@/api/base44Client";
import { CATEGORIA_CONE_MAP } from "@/components/atlas/constants";

const ACTIVE_ESTADOS = ["entrada", "classificada", "autorizada", "em_execucao", "pronta", "manutencao"];

export async function autoAssignCone(categoria) {
  const coneCor = CATEGORIA_CONE_MAP[categoria];
  if (!coneCor) return { cone_cor: null, cone_numero: null };

  const ciclosWithCone = await base44.entities.Ciclo.filter({ cone_cor: coneCor });
  const activeNums = ciclosWithCone
    .filter((c) => ACTIVE_ESTADOS.includes(c.estado) && c.cone_numero)
    .map((c) => parseInt(c.cone_numero, 10))
    .filter((n) => !isNaN(n));

  const maxNum = activeNums.length > 0 ? Math.max(...activeNums) : 0;
  return { cone_cor: coneCor, cone_numero: String(maxNum + 1) };
}