import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { registerSW } from 'virtual:pwa-register'
import { recuperarERecarregar, eErroDeVersaoPresa } from '@/lib/recuperacao'
import { anunciarVersaoNova, criarTrocaDeVersao, INTERVALO_VERIFICACAO } from '@/lib/atualizacao'

/**
 * Rede de segurança contra uma versão presa em cache.
 *
 * Mesmo com o `index.html` a vir sempre da rede, um separador que já estava
 * aberto quando se publicou continua a correr o código antigo. Se nessa altura
 * pedir um pedaço de código que só existe na versão velha — a folha de Excel, o
 * ZIP do backup — a importação falha e a aplicação parte-se.
 *
 * Nesse caso limpa-se o service worker e as caches e recarrega-se, **uma vez**.
 * A sessão e as preferências ficam, que estão no `localStorage` e não têm culpa
 * nenhuma.
 */
const opcoesDeRecuperacao = () => ({
  serviceWorker: typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined,
  caches: typeof window !== 'undefined' ? window.caches : undefined,
  armazenamento: (() => { try { return window.sessionStorage } catch (_e) { return null } })(),
  recarregar: () => window.location.reload(),
})

const tratarErro = (erro) => {
  if (!eErroDeVersaoPresa(erro)) return
  recuperarERecarregar(opcoesDeRecuperacao())
}

// O Vite avisa quando falha a pré-carregar um pedaço de código; os outros dois
// apanham o que escapar por outras vias.
window.addEventListener('vite:preloadError', (e) => tratarErro(e?.payload || e))
window.addEventListener('error', (e) => tratarErro(e?.error || e?.message))
window.addEventListener('unhandledrejection', (e) => tratarErro(e?.reason))


/**
 * Avisa quando há versão nova, sem a impor.
 *
 * Com `registerType: 'prompt'` o service worker novo não se impõe à página
 * aberta: ela continua com os ficheiros dela e nada lhe é puxado debaixo dos
 * pés a meio de um registo.
 *
 * A verificação periódica existe porque o browser só procura versões novas
 * quando a página carrega: sem ela, quem deixa o ATLAS aberto o dia todo nunca
 * saberia que há uma.
 */
const contentorSW = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined

// Declarado antes para a troca o poder chamar; o `registerSW` devolve-o abaixo.
let pedirTrocaAoWorker = null

const troca = criarTrocaDeVersao({
  obterAEspera: async () => (await contentorSW?.getRegistration?.())?.waiting,
  pedirTroca: () => pedirTrocaAoWorker?.(),
  recarregar: () => window.location.reload(),
  contentor: contentorSW,
})

pedirTrocaAoWorker = registerSW({
  onNeedRefresh() {
    // O botão só recarregava, porque numa medição o worker novo já se tinha
    // ativado sozinho e o `updateSW` não fazia nada. Medido depois com um
    // separador só, o worker novo ficava à espera para sempre: a barra voltava
    // a cada arranque e, sem rede, a página ficava em branco. A troca cobre os
    // dois casos — sem worker à espera recarrega logo; com ele, pede-lhe que
    // salte a espera e recarrega UMA vez quando ele assume. A guarda é o que
    // impede o ciclo de 94 recargas.
    anunciarVersaoNova(() => { troca.trocar() })
  },
  // O registo também avisa quando o worker novo assume — em todos os
  // separadores. Só recarrega o que pediu a troca, e pela mesma guarda, para
  // não haver duas recargas por uma troca nem apagar registos noutro separador.
  onNeedReload: troca.recarregarSePedida,
  onRegisteredSW(_url, registo) {
    if (!registo) return
    setInterval(() => { registo.update().catch(() => {}) }, INTERVALO_VERIFICACAO)
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
