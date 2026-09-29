import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { registerSW } from 'virtual:pwa-register'
import { recuperarERecarregar, eErroDeVersaoPresa } from '@/lib/recuperacao'
import { anunciarVersaoNova, INTERVALO_VERIFICACAO } from '@/lib/atualizacao'

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
registerSW({
  onNeedRefresh() {
    // Recarregar, e mais nada.
    //
    // O caminho "certo" seria `updateSW(true)`, que manda o worker à espera
    // assumir o lugar e recarrega sozinho. Medido em browser, não serve: na
    // altura em que se carrega no botão o worker novo já se ativou por si, não
    // há nada para saltar, e o `updateSW` devolve sem recarregar — o botão não
    // fazia nada. Combinar os dois é pior: dá um ciclo de recargas, 94 numa
    // medição.
    //
    // Como o `index.html` vem sempre da rede, a recarga sozinha traz a versão
    // nova. É simples, foi medida, e não tem como entrar em ciclo.
    anunciarVersaoNova(() => window.location.reload())
  },
  onRegisteredSW(_url, registo) {
    if (!registo) return
    setInterval(() => { registo.update().catch(() => {}) }, INTERVALO_VERIFICACAO)
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
