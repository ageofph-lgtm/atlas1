import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { registerSW } from 'virtual:pwa-register'
import { recuperarERecarregar, eErroDeVersaoPresa } from '@/lib/recuperacao'
import { anunciarVersaoNova, criarTrocaDeVersao, INTERVALO_VERIFICACAO } from '@/lib/atualizacao'
import {
  vigiarVersao, entradaDoHtml, entradaDoDocumento, versaoMudou, enderecoSemCache,
  podeAtualizarSozinho, marcarAtualizacaoAutomatica, esquecerSeJaChegou, decidir,
} from '@/lib/versao'

// O código chegou e está a correr: o vigia do `index.html` pode descansar.
window.__atlasArrancou = true
document.getElementById('arranque-vigiado')?.remove()

/**
 * Recarregar por um endereço que nenhuma cache conhece.
 *
 * Um `reload()` simples podia trazer outra vez o `index.html` velho que o
 * browser guardou — medido: depois de atualizar em "/Inventario", abrir por "/"
 * dava a versão velha, ou a página em branco quando os ficheiros dela já não
 * existiam. É o que o Ctrl+Shift+R resolvia à mão.
 */
const recarregarSemCache = () => window.location.replace(enderecoSemCache(window.location.href))

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
  recarregar: recarregarSemCache,
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
  recarregar: recarregarSemCache,
  contentor: contentorSW,
})

/**
 * Versão nova no servidor, vista por esta página (ver `lib/versao.js`).
 *
 * O `index.html` publicado pede-se com `no-store` e endereço novo, para não
 * ser a cache a responder. No arranque, antes de alguém mexer, atualiza-se
 * sozinho — uma vez por versão; depois, só se avisa.
 */
const entradaAtual = entradaDoDocumento(document)
const armazenamento = (() => { try { return window.localStorage } catch (_e) { return null } })()
esquecerSeJaChegou(armazenamento, entradaAtual)
let interagiu = false
const marcarInteracao = () => { interagiu = true }
window.addEventListener('pointerdown', marcarInteracao, { once: true, capture: true })
window.addEventListener('keydown', marcarInteracao, { once: true, capture: true })

const consultarPublicada = async () => {
  const resposta = await fetch(enderecoSemCache(`${window.location.origin}/`), {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'text/html' },
  })
  return resposta.ok ? entradaDoHtml(await resposta.text()) : null
}

let registoSW = null

const aoDetetarVersaoNova = ({ publicada, noArranque }) => {
  // Traz já o service worker novo, para a troca estar pronta ao carregar no botão.
  registoSW?.update?.().catch(() => {})
  const acao = decidir({ noArranque, interagiu, podeSozinho: podeAtualizarSozinho(armazenamento, publicada) })
  if (acao === 'atualizar') {
    marcarAtualizacaoAutomatica(armazenamento, publicada)
    troca.trocar()
    return
  }
  anunciarVersaoNova(() => { troca.trocar() })
}

if (import.meta.env.PROD && entradaAtual) {
  vigiarVersao({ consultar: consultarPublicada, entradaAtual, aoDetetar: aoDetetarVersaoNova, documento: document, janela: window })
}

pedirTrocaAoWorker = registerSW({
  async onNeedRefresh() {
    // Há um worker novo à espera. Se esta página já corre a versão publicada
    // (veio fresca da rede), não há nada a pedir à pessoa: troca-se o worker em
    // silêncio, sem recarregar. Antes aparecia a barra numa página que já
    // estava atualizada, e carregar nela não mudava nada.
    const publicada = await consultarPublicada().catch(() => null)
    if (entradaAtual && publicada && !versaoMudou(entradaAtual, publicada)) {
      pedirTrocaAoWorker?.()
      return
    }
    // A troca: sem worker à espera recarrega logo; com ele, pede-lhe que salte
    // a espera e recarrega UMA vez quando ele assume. A guarda é o que impede o
    // ciclo de 94 recargas.
    anunciarVersaoNova(() => { troca.trocar() })
  },
  // O registo também avisa quando o worker novo assume — em todos os
  // separadores. Só recarrega o que pediu a troca, e pela mesma guarda, para
  // não haver duas recargas por uma troca nem apagar registos noutro separador.
  onNeedReload: troca.recarregarSePedida,
  onRegisteredSW(_url, registo) {
    if (!registo) return
    registoSW = registo
    setInterval(() => { registo.update().catch(() => {}) }, INTERVALO_VERIFICACAO)
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
