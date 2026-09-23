import { normalizarEmail, perfilEfetivo } from "@/components/atlas/acessos";

/**
 * Quanto tempo uma pessoa fica dentro sem voltar a provar quem é.
 *
 * Sessenta dias é generoso, e de propósito: isto vive num telemóvel no bolso de
 * quem anda no pátio, e obrigar a repetir o login de duas em duas semanas
 * acabaria com a app a ser usada em papel outra vez.
 *
 * O que torna os 60 dias aceitáveis não é o número — é haver revogação. Tirar
 * um email da lista em `acessos.js` põe a pessoa fora no arranque seguinte, sem
 * esperar pelo prazo. Sem isso, "expira em novembro" não servia de nada quando
 * se perde um telemóvel numa sexta-feira.
 */
export const SESSAO_DIAS = 60;
const CHAVE = "atlas:sessao";

const agoraISO = () => new Date().toISOString();

/**
 * Dias inteiros desde uma data. `null` quando a data não presta.
 *
 * O `if (!desde)` não é defensividade a mais: `new Date(null).getTime()` é 0,
 * não NaN, por isso uma data em falta passaria por válida e daria a idade da
 * época Unix — mais de cinquenta anos, que seria lido como sessão expirada em
 * vez de sessão inexistente. Dois motivos diferentes, dois ecrãs diferentes.
 */
export function diasDesde(desde, agora = Date.now()) {
  if (!desde) return null;
  const t = new Date(desde).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((agora - t) / 86400000);
}

/**
 * Decide o que fazer com o que está guardado, sem tocar no armazenamento.
 *
 * Separado da leitura de propósito: é aqui que estão as regras, e assim podem
 * ser testadas sem browser. Devolve sempre um motivo — um fim de sessão calado
 * é indistinguível de uma avaria, e quem o vê não sabe se voltar a entrar
 * resolve ou não.
 */
export function avaliarSessao(guardada, email, { agora = Date.now(), dias = SESSAO_DIAS } = {}) {
  const atual = normalizarEmail(email);
  if (!atual) return { valida: false, motivo: "sem_email" };
  if (!guardada?.desde) return { valida: false, motivo: "nova" };
  // Outra pessoa entrou neste aparelho: a sessão anterior não lhe pertence.
  if (normalizarEmail(guardada.email) !== atual) return { valida: false, motivo: "outro_email" };

  const idade = diasDesde(guardada.desde, agora);
  if (idade === null) return { valida: false, motivo: "data_invalida" };
  if (idade >= dias) return { valida: false, motivo: "expirada", idade };

  return { valida: true, idade, faltam: dias - idade };
}

const ler = () => {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) || "null");
  } catch (_e) {
    // janela privada, armazenamento bloqueado ou valor corrompido
    return null;
  }
};

const gravar = (valor) => {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(valor));
  } catch (_e) {
    // não poder guardar não pode impedir de entrar — só faz a sessão não durar
  }
};

export const limparSessao = () => {
  try {
    localStorage.removeItem(CHAVE);
  } catch (_e) {
    // nada a fazer; a sessão morre com a aba, que é o lado seguro do erro
  }
};

/**
 * Abre ou continua a sessão deste email, e diz qual o perfil em vigor.
 *
 * O perfil sai sempre de `acessos.js`. O que está guardado aqui é só a escolha
 * de quem tem mais do que um perfil — e mesmo essa é filtrada pela lista, para
 * um valor velho ou escrito à mão não dar permissões que a lista não dá.
 */
export function abrirSessao(email, opcoes = {}) {
  const guardada = ler();
  const estado = avaliarSessao(guardada, email, opcoes);
  const desde = estado.valida ? guardada.desde : agoraISO();
  const escolhido = estado.valida ? guardada.perfil : null;
  const perfil = perfilEfetivo(email, escolhido);

  if (!perfil) {
    limparSessao();
    return { perfil: null, estado };
  }

  gravar({ email: normalizarEmail(email), desde, perfil });
  return { perfil, desde, estado, faltam: estado.faltam };
}

/** Guarda a troca de perfil de quem pode trocar. Devolve o que ficou a valer. */
export function guardarPerfil(email, escolhido) {
  const perfil = perfilEfetivo(email, escolhido);
  if (!perfil) return null;
  const guardada = ler();
  gravar({
    email: normalizarEmail(email),
    desde: guardada?.desde || agoraISO(),
    perfil,
  });
  return perfil;
}
