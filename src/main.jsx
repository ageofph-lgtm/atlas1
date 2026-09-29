import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { recuperarERecarregar, limparTentativa, eErroDeVersaoPresa } from '@/lib/recuperacao'

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

// Chegou aqui, o código carregou todo: a marca de tentativa já não serve para
// nada e ficar lá impediria uma recuperação legítima mais tarde.
limparTentativa(opcoesDeRecuperacao().armazenamento)

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
