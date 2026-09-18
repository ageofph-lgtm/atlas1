import { base44 } from "@/api/base44Client";
import { notificarMudancaGestao } from "@/components/atlas/mensagens";

/**
 * Gravação partilhada do EditMaquinaModal (inventário + autorização).
 * Atualiza a Maquina, aplica as alterações ao Ciclo com eventos de auditoria
 * e, se o NS mudou, propaga o novo NS a todos os registos ligados.
 * Devolve a mensagem de sucesso para o toast do chamador.
 */
export async function saveMaquinaEdit({ maquina, ciclo, specs, cicloUpdates = {}, newSerie = null, autor }) {
  const oldSerie = maquina.serie;
  const finalSerie = newSerie || oldSerie;

  const maquinaUpdate = {
    mastro: specs.mastro || "",
    vias_mastro: specs.vias_mastro || "",
    joystick: specs.joystick || "",
    tipo_pneu: specs.tipo_pneu || "",
    acessorios: specs.acessorios || [],
    h3: specs.h3 || "",
    bateria: specs.bateria || "",
  };
  if (newSerie) maquinaUpdate.serie = newSerie;
  await base44.entities.Maquina.update(maquina.id, maquinaUpdate);

  if (ciclo && Object.keys(cicloUpdates).length > 0) {
    await base44.entities.Ciclo.update(ciclo.id, cicloUpdates);
    if (cicloUpdates.categoria && cicloUpdates.categoria !== ciclo.categoria) {
      const coneLabel = cicloUpdates.cone_cor ? `${cicloUpdates.cone_cor} ${cicloUpdates.cone_numero || ""}`.trim() : "sem cone";
      await base44.entities.EventoCiclo.create({
        ciclo_id: ciclo.id,
        serie: finalSerie,
        de_estado: ciclo.categoria,
        para_estado: cicloUpdates.categoria,
        autor,
        nota: `Categoria definida: ${cicloUpdates.categoria} → cone ${coneLabel}`,
      });
    }
    if (cicloUpdates.estado && cicloUpdates.estado !== ciclo.estado) {
      await base44.entities.EventoCiclo.create({
        ciclo_id: ciclo.id,
        serie: finalSerie,
        de_estado: ciclo.estado,
        para_estado: cicloUpdates.estado,
        autor,
        nota: "Estado alterado manualmente",
      });
    }
  }

  // A logística precisa de saber quando a gestão reclassifica ou muda o estado.
  if (ciclo && (cicloUpdates.categoria || cicloUpdates.estado)) {
    await notificarMudancaGestao(
      { ...ciclo, serie: finalSerie },
      {
        autor,
        categoriaAnterior: ciclo.categoria,
        categoriaNova: cicloUpdates.categoria,
        estadoAnterior: ciclo.estado,
        estadoNovo: cicloUpdates.estado,
      }
    );
  }

  // Cascata: renomear o NS em todos os Ciclo + EventoCiclo ligados (watcher_os_id intacto)
  if (newSerie && newSerie !== oldSerie) {
    await base44.entities.Ciclo.updateMany({ serie: oldSerie }, { $set: { serie: newSerie } });
    await base44.entities.EventoCiclo.updateMany({ serie: oldSerie }, { $set: { serie: newSerie } });
    return `NS: ${oldSerie} → ${newSerie} (registos ligados atualizados)`;
  }
  return `NS: ${finalSerie}`;
}
