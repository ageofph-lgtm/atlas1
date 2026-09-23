/**
 * Quem entra no ATLAS, e com que perfil.
 *
 * Esta lista é a fonte de verdade. O perfil **não** é escolhido por quem entra
 * nem lido do registo do utilizador: é derivado do email em cada arranque.
 *
 * A diferença não é cosmética. Antes, o ecrã de entrada deixava escolher
 * "Administrador" e gravava essa escolha com `updateMyUserData({ perfil })` —
 * ou seja, o cliente decidia as suas próprias permissões, e qualquer pessoa que
 * chamasse a API podia gravar o que quisesse. Agora o registo gravado é
 * ignorado; vale o que está aqui.
 *
 * Tem duas consequências boas:
 *  - tirar um email desta lista põe a pessoa fora no arranque seguinte, sem
 *    esperar pelo fim da sessão — é a revogação, que é o que faz falta quando
 *    se perde um telemóvel ou alguém muda de funções;
 *  - o perfil de cada um passa a ser revisto em code review, como o resto.
 *
 * O que isto **não** faz: impedir que alguém de fora chegue aos dados. Isso é a
 * definição de visibilidade da app no Base44 ("Privado" + convites), que
 * bloqueia antes de este ficheiro sequer correr. Sem ela, isto é uma lista de
 * permissões dentro de uma casa com a porta aberta.
 */

/** Perfis que o ATLAS conhece, por ordem de alcance. */
export const PERFIS = ["administrador", "gestor_frota", "logistica", "comercial", "visitante"];

/**
 * `perfis` com mais do que um significa que a pessoa pode trocar entre eles.
 * O primeiro é o de entrada — é onde fica sem fazer nada.
 */
export const ACESSOS = [
  { email: "carlos.goncalves@still.pt", nome: "Carlos Gonçalves", perfis: ["comercial"] },
  { email: "nuno.lopes@still.pt", nome: "Nuno Lopes", perfis: ["comercial"] },
  { email: "joao.neves@still.pt", nome: "João Neves", perfis: ["comercial"] },
  { email: "pedro.borges@still.pt", nome: "Pedro Borges", perfis: ["comercial"] },
  { email: "angelo.correia@kiongroup.com", nome: "Angelo Correia", perfis: ["gestor_frota"] },
  { email: "catarina.goncalves@still.pt", nome: "Catarina Gonçalves", perfis: ["gestor_frota"] },
  { email: "luis.sousa@still.pt", nome: "Luís Sousa", perfis: ["logistica"] },
  // Entra em administrador por defeito e pode passar a qualquer outro perfil,
  // para poder ver o programa pelos olhos de quem o usa.
  { email: "raphael.toledo@still.pt", nome: "Raphael Toledo", perfis: PERFIS },
];

/**
 * Emails comparam-se em minúsculas e sem espaços.
 *
 * Quem escreve `Carlos.Goncalves@Still.pt` é a mesma pessoa, e um fornecedor de
 * identidade pode devolver o email com outra caixa da que tem aqui escrita.
 */
export const normalizarEmail = (email) => String(email || "").trim().toLowerCase();

/** A entrada da lista para este email, ou `null` se não houver. */
export const acessoDe = (email) => {
  const alvo = normalizarEmail(email);
  if (!alvo) return null;
  return ACESSOS.find((a) => normalizarEmail(a.email) === alvo) || null;
};

/** Se esta pessoa tem entrada. É a pergunta que o ecrã de entrada faz. */
export const temAcesso = (email) => !!acessoDe(email);

/** Os perfis que este email pode usar. Vazio quando não tem acesso nenhum. */
export const perfisDe = (email) => acessoDe(email)?.perfis || [];

/** Aquele em que entra sem escolher nada. */
export const perfilPadrao = (email) => perfisDe(email)[0] || null;

/** Só faz sentido mostrar o seletor a quem tem mais do que um. */
export const podeTrocarPerfil = (email) => perfisDe(email).length > 1;

/**
 * O perfil que vale agora.
 *
 * Um perfil escolhido só conta se a lista o permitir a este email. É o que
 * impede que um valor antigo no armazenamento do browser — ou escrito à mão —
 * dê permissões que a lista não dá.
 */
export function perfilEfetivo(email, escolhido) {
  const permitidos = perfisDe(email);
  if (!permitidos.length) return null;
  return permitidos.includes(escolhido) ? escolhido : permitidos[0];
}

/** O nome que aparece no ecrã e fica nos registos, sem depender do fornecedor. */
export const nomeDe = (email) => acessoDe(email)?.nome || null;

/**
 * Se esta conta pode entrar, e porquê não quando não pode.
 *
 * Tem de ser mais do que "o email está na lista", por causa de como funciona a
 * autenticação por email e password: **qualquer pessoa pode escrever qualquer
 * email ao registar-se**. Um email por confirmar é uma alegação, não um facto,
 * e sem esta verificação bastaria alguém registar-se como
 * `carlos.goncalves@still.pt` e nunca abrir o email de confirmação para receber
 * o perfil de comercial.
 *
 * Com a app em "Privado" isso já não chega à porta — mas a porta não pode
 * depender de uma definição do painel para estar fechada.
 *
 * `is_verified` ausente **não** bloqueia, de propósito. O tipo do SDK diz que
 * vem sempre, mas se um dia não vier, exigi-lo poria toda a gente fora ao mesmo
 * tempo — um estrago maior do que o risco que fecha, já que o "Privado" cobre o
 * mesmo caso por outro lado. Só um `false` explícito recusa.
 */
export function estadoDeAcesso(utilizador) {
  const email = normalizarEmail(utilizador?.email);
  if (!email) return "sem_sessao";
  if (!temAcesso(email)) return "sem_acesso";
  // Desativar a conta no painel do Base44 é a forma de pôr alguém de fora sem
  // mexer no código — vale como revogação tal como tirá-lo desta lista.
  if (utilizador.disabled === true) return "desativado";
  if (utilizador.is_verified === false) return "nao_confirmado";
  return "ok";
}
