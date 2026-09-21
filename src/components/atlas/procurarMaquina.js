import { base44 } from "@/api/base44Client";
import { classificarCiclosAbertos } from "@/components/atlas/cicloUtils";

/**
 * O que se sabe de uma série antes de a registar.
 *
 * É a consulta que decide meia página de entrada: se a máquina já é conhecida,
 * quantas vezes passou, quando saiu da última vez, e — o que mais importa — se
 * tem um ciclo por fechar, no pátio ou em aluguer.
 *
 * Fica fora do componente para poder ser testada. O `debounce` e o estado do
 * ecrã são da página; isto só vai buscar e arrumar.
 */
export async function procurarMaquina(serie) {
  const vazio = {
    maquina: null,
    specs: { mastro: "", vias_mastro: "", joystick: "", tipo_pneu: "", acessorios: [], h3: "", bateria: "" },
    passagens: 0,
    ultimaSaida: null,
    cicloNoPatio: null,
    cicloFora: null,
    notas: "",
  };

  const maquinas = await base44.entities.Maquina.filter({ serie });
  if (maquinas.length === 0) return vazio;

  const m = maquinas[0];
  const ciclos = await base44.entities.Ciclo.filter({ serie });
  const { noPatio, fora } = classificarCiclosAbertos(ciclos);
  const saidas = ciclos
    .filter((c) => c.data_saida)
    .sort((a, b) => new Date(b.data_saida) - new Date(a.data_saida));

  return {
    maquina: m,
    specs: {
      mastro: m.mastro || "",
      vias_mastro: m.vias_mastro || "",
      joystick: m.joystick || "",
      tipo_pneu: m.tipo_pneu || "",
      acessorios: m.acessorios || [],
      h3: m.h3 || "",
      bateria: m.bateria || "",
    },
    passagens: ciclos.length,
    ultimaSaida: saidas[0]?.data_saida || null,
    cicloNoPatio: noPatio,
    cicloFora: fora,
    // As notas ficam editáveis: numa reentrada podem ter de mudar.
    notas: m.observacoes || "",
  };
}
