import { base44 } from "@/api/base44Client";
import { listarTudo } from "@/components/atlas/carregarTudo";

/**
 * As entidades que o backup guarda.
 *
 * Esta lista já incluiu `Pedido`, `OrdemServico`, `FrotaACP` e `Notificacao`,
 * apagadas há muito. `base44.entities.Pedido` era `undefined`, a leitura
 * rebentava na primeira delas, e o `catch` à volta do ciclo inteiro transformava
 * isso num "Erro ao gerar o backup" — **nenhum** backup saía, nem sequer das
 * entidades que existiam. Quem carregava no botão de vez em quando e via um
 * erro genérico não tinha como saber que não tinha cópia nenhuma.
 *
 * Por isso o que valida a lista deixou de ser a memória de quem a escreveu:
 * `entidadesDoBackup` compara-a com o que o cliente tem mesmo, e o que faltar é
 * dito no ecrã em vez de rebentar tudo.
 */
export const BACKUP_ENTITIES = ["Maquina", "Ciclo", "EventoCiclo", "Mensagem", "PedidoMaquina"];

const BUILTIN_FIELDS = ["id", "created_date", "updated_date", "created_by_id"];

/** Chave que identifica o mesmo registo em dois ficheiros, para não duplicar no restauro. */
export const NATURAL_KEYS = {
  Maquina: (r) => r.serie || null,
  Ciclo: (r) => `${r.maquina_id}|${r.estado}|${r.data_entrada || ""}`,
  EventoCiclo: (r) => `${r.ciclo_id}|${r.de_estado || ""}|${r.para_estado}|${r.nota || ""}`,
  Mensagem: (r) => `${r.destino || r.destino_user_id}|${r.titulo}|${r.ciclo_id || ""}|${r.created_date || ""}`,
  PedidoMaquina: (r) => `${r.ciclo_id}|${r.texto}|${r.comercial_user_id || ""}`,
};

/**
 * Separa o que existe do que já não existe, sem tocar na rede.
 *
 * Devolve as duas listas em vez de filtrar em silêncio: uma entidade que
 * desapareceu do modelo é um aviso a dar a quem faz o backup, não um detalhe a
 * esconder.
 */
export function entidadesDoBackup(cliente, nomes = BACKUP_ENTITIES) {
  const existentes = nomes.filter((n) => !!cliente?.entities?.[n]);
  return { existentes, emFalta: nomes.filter((n) => !existentes.includes(n)) };
}

/** Tira os campos que o Base44 gera sozinho — restaurá-los criava conflitos de id. */
export const semCamposDoSistema = (registo) => {
  const out = { ...registo };
  BUILTIN_FIELDS.forEach((f) => delete out[f]);
  return out;
};

/**
 * Lê tudo o que vai para o ficheiro.
 *
 * Recusa-se a devolver um backup truncado. Um ficheiro que parece completo e
 * não é só se descobre no dia em que é preciso — que é o pior dia possível
 * para o descobrir.
 */
export async function recolherBackup(cliente = base44, { maximo = 50000, nomes = BACKUP_ENTITIES } = {}) {
  const { existentes, emFalta } = entidadesDoBackup(cliente, nomes);
  const entities = {};
  const incompletas = [];

  for (const nome of existentes) {
    const { registos, truncado } = await listarTudo(cliente.entities[nome], { maximo });
    entities[nome] = registos;
    if (truncado) incompletas.push(nome);
  }

  if (incompletas.length) {
    throw new Error(`Backup incompleto — ${incompletas.join(", ")} passou o limite de leitura. Não é seguro guardar este ficheiro.`);
  }

  const total = Object.values(entities).reduce((s, r) => s + r.length, 0);
  return {
    payload: { app: "ATLAS", version: 1, exportedAt: new Date().toISOString(), entities },
    total,
    emFalta,
  };
}

/** O que há para importar de um ficheiro, sem o que já existe na app. */
export function novosRegistos(doFicheiro = [], jaExistentes = [], nome) {
  const chave = NATURAL_KEYS[nome];
  if (!chave) return doFicheiro.map(semCamposDoSistema);
  const conhecidas = new Set(jaExistentes.map(chave).filter(Boolean));
  return doFicheiro.map(semCamposDoSistema).filter((r) => {
    const k = chave(r);
    return k ? !conhecidas.has(k) : true;
  });
}

/** Um ficheiro só serve se trouxer entidades lá dentro. */
export const ficheiroValido = (dados) =>
  !!dados && typeof dados === "object" && !!dados.entities && typeof dados.entities === "object";
