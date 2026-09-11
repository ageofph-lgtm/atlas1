import { base44 } from "@/api/base44Client";

/**
 * Shared authorize flow — calls the atlasToWatcher backend function
 * with tarefas / isVps / isExpress so the machine lands in Watcher
 * a-fazer with tasks pre-selected.
 */
export async function authorizeCiclo(ciclo_id, autor, { tarefas = [], isVps = false, isExpress = false } = {}) {
  const res = await base44.functions.invoke("atlasToWatcher", {
    action: "authorize",
    ciclo_id,
    autor,
    tarefas,
    isVps,
    isExpress,
  });
  const data = res?.data !== undefined ? res.data : res;
  if (data.error) throw new Error(data.error);
  return data;
}