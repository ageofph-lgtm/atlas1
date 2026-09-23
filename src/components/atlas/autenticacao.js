/**
 * As URLs de login e de logout da plataforma, construídas à prova de falta.
 *
 * O SDK monta-as assim:
 *
 *     `${appBaseUrl}/api/apps/auth/logout?from_url=…`
 *     `${appBaseUrl}/login?from_url=…`
 *
 * e `appBaseUrl` vem de `appParams`, que o devolve a `null` quando não veio no
 * endereço, nem no ambiente da build, nem no armazenamento. Com `null`, o
 * template produz literalmente `"null/api/apps/auth/logout?…"` — um caminho
 * relativo que não existe. O browser sai da aplicação, não chega a lado nenhum,
 * e a página fica em branco: foi exatamente isto que aconteceu ao carregar em
 * "Sair e usar outra conta".
 *
 * A aplicação é servida pelo próprio domínio da app, por isso a origem atual é
 * a resposta certa quando o parâmetro falta.
 */
export const baseDaApp = (params = {}, origem = "") =>
  String(params.appBaseUrl || "").replace(/\/+$/, "") || String(origem || "").replace(/\/+$/, "");

const comFrom = (base, caminho, destino) =>
  `${base}${caminho}?from_url=${encodeURIComponent(destino)}`;

/** Onde a plataforma pede as credenciais. */
export const urlDeLogin = (base, destino) => comFrom(base, "/login", destino);

/**
 * Onde a plataforma termina a sessão.
 *
 * O `from_url` aponta para o **login**, não para a aplicação. Voltar à
 * aplicação sem sessão faz a plataforma detetar que falta autenticação e
 * reencaminhar outra vez — e, se esse reencaminhamento falhar, fica-se num
 * ecrã vazio sem forma de sair. Mandar direto para o login corta esse salto.
 */
export const urlDeLogout = (base, destinoFinal) =>
  comFrom(base, "/api/apps/auth/logout", urlDeLogin(base, destinoFinal));
