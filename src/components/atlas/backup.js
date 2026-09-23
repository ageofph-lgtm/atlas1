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

/**
 * Onde é que cada entidade guarda endereços de fotografias **que vale a pena
 * guardar**.
 *
 * Não são todas. A foto da placa do número de série (`Maquina.foto_url`) e a
 * da placa na saída (`Ciclo.foto_saida`) servem para ler o NS no momento em que
 * são tiradas e não voltam a fazer falta — guardá-las multiplicava o tamanho do
 * ficheiro por nada.
 *
 * As que ficam são as que vivem no cartão da máquina: a bateria e o carregador
 * que saíram com ela, e as fotografias do estado da máquina no pátio. Essas são
 * insubstituíveis — não se voltam a tirar depois de a máquina sair.
 */
export const CAMPOS_FOTO = {
  Maquina: ["fotos"],
  Ciclo: ["bateria_foto_url", "carregador_foto_url"],
};

const eEndereco = (v) => typeof v === "string" && /^https?:\/\//i.test(v);

/** Um campo de foto pode ser um endereço ou uma lista deles (`Maquina.fotos`). */
const enderecosDoCampo = (valor) =>
  (Array.isArray(valor) ? valor : [valor]).filter(eEndereco);

/** Todos os endereços de foto de um conjunto de entidades, sem repetições. */
export function urlsDeFotos(entities = {}) {
  const urls = new Set();
  for (const [nome, campos] of Object.entries(CAMPOS_FOTO)) {
    for (const registo of entities[nome] || []) {
      for (const campo of campos) {
        for (const url of enderecosDoCampo(registo?.[campo])) urls.add(url);
      }
    }
  }
  return [...urls];
}

/**
 * O nome que a foto leva dentro do ZIP.
 *
 * O índice à frente garante que dois ficheiros com o mesmo nome no servidor não
 * se sobrepõem — perder uma foto por causa de uma colisão de nomes seria um
 * modo de falhar particularmente parvo. O resto do nome vem do endereço só para
 * o ficheiro ser legível por dentro.
 */
export function nomeDeFoto(url, indice) {
  const limpo = String(url || "").split("?")[0].split("#")[0];
  const base = (limpo.split("/").pop() || "foto").replace(/[^A-Za-z0-9._-]/g, "_").slice(-40);
  return `fotos/${String(indice + 1).padStart(4, "0")}-${base || "foto"}`;
}

/** Limite de segurança: um ZIP maior do que isto não cabe na memória do browser. */
export const LIMITE_FOTOS_BYTES = 400 * 1024 * 1024;

/**
 * Descarrega as imagens, com um travão.
 *
 * Nunca trunca em silêncio: o que não coube e o que não respondeu vêm de volta
 * nomeados, para o ecrã poder dizer quantas fotos ficaram de fora. Um backup
 * que se diz completo e não é só se descobre no dia do restauro.
 */
export async function recolherFotos(urls = [], { buscar, limiteBytes = LIMITE_FOTOS_BYTES, onProgresso } = {}) {
  const ficheiros = {};
  const mapa = {};
  const falhadas = [];
  let bytes = 0;
  let paradoNoLimite = false;

  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i];
    onProgresso?.({ feitas: i, total: urls.length });
    if (paradoNoLimite) { falhadas.push({ url, motivo: "limite" }); continue; }
    try {
      const dados = await buscar(url);
      if (!dados?.byteLength) throw new Error("vazio");
      if (bytes + dados.byteLength > limiteBytes) {
        paradoNoLimite = true;
        falhadas.push({ url, motivo: "limite" });
        continue;
      }
      const nome = nomeDeFoto(url, i);
      ficheiros[nome] = new Uint8Array(dados);
      mapa[url] = nome;
      bytes += dados.byteLength;
    } catch (e) {
      falhadas.push({ url, motivo: e?.message || "erro" });
    }
  }

  onProgresso?.({ feitas: urls.length, total: urls.length });
  return { ficheiros, mapa, falhadas, bytes, paradoNoLimite };
}

/**
 * Troca os endereços antigos pelos novos, depois de as fotos serem recarregadas.
 *
 * Um endereço que não esteja no mapa fica como está — é melhor um endereço
 * antigo, que ainda funciona enquanto a app de origem existir, do que um campo
 * vazio ou um caminho para dentro de um ZIP que já ninguém tem.
 */
export function trocarEnderecosDeFoto(registo, nomeEntidade, mapa = {}) {
  const campos = CAMPOS_FOTO[nomeEntidade];
  if (!campos) return registo;
  const out = { ...registo };
  for (const campo of campos) {
    const atual = out[campo];
    if (Array.isArray(atual)) out[campo] = atual.map((u) => (eEndereco(u) && mapa[u] ? mapa[u] : u));
    else if (eEndereco(atual) && mapa[atual]) out[campo] = mapa[atual];
  }
  return out;
}

/** Quantas fotos há para descarregar, para se poder avisar antes de começar. */
export const contarFotos = (entities) => urlsDeFotos(entities).length;
