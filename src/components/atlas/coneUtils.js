import { base44 } from "@/api/base44Client";
import { CATEGORIA_CONE_MAP } from "@/components/atlas/constants";
import { cicloOcupaCone } from "@/components/atlas/cicloUtils";

/**
 * Um cone só está ocupado enquanto a máquina está no pátio.
 *
 * Havia aqui uma segunda lista de estados, escrita à mão e já fora de sincronia
 * com o resto: incluía `retorno`, que está fora do pátio. Agora a pergunta é
 * feita uma vez só, em `cicloOcupaCone`.
 */
export async function validateConeNumber(categoria, numero, excludeCicloId) {
  const coneCor = CATEGORIA_CONE_MAP[categoria];
  if (!coneCor || !numero) return { free: true };

  const results = await base44.entities.Ciclo.filter({ cone_cor: coneCor });
  const conflict = results.find(
    (c) => cicloOcupaCone(c) && String(c.cone_numero) === String(numero) && c.id !== excludeCicloId
  );

  return conflict ? { free: false, conflito: conflict } : { free: true };
}
