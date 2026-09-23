import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { baseDaApp } from '@/components/atlas/autenticacao';

const { appId, token, functionsVersion } = appParams;

/**
 * `appBaseUrl` com rede de segurança.
 *
 * O SDK usa-o para construir as URLs de login e de logout por interpolação
 * direta. Quando `appParams` o devolve a `null` — acontece quando não veio no
 * endereço nem na build — o resultado é `"null/login?…"`, um caminho relativo
 * que não existe: o browser sai da aplicação e a página fica em branco, sem
 * erro nenhum na consola.
 *
 * Isto não afeta só o nosso código: o `AuthContext` da plataforma chama
 * `redirectToLogin` pelo mesmo cliente, e era aí que se ficava preso, porque
 * o `App.jsx` devolve `null` enquanto espera por um reencaminhamento que nunca
 * chegava a acontecer.
 */
const appBaseUrl = baseDaApp(appParams, typeof window !== 'undefined' ? window.location.origin : '');

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});
