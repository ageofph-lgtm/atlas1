import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      visualEditAgent: true
    }),
    react(),
    // Service worker só para o invólucro da aplicação: sem rede, o ATLAS abre
    // em vez de dar página em branco. Os dados continuam a vir da rede — o que
    // não há é uma fila de escrita, que precisaria de regras de conflito que
    // este sistema ainda não tem.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ATLAS',
        short_name: 'ATLAS',
        description: 'Gestão do pátio de empilhadores',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,svg,woff2}'],
        // O `index.html` NÃO é pré-carregado, e é essa a correção central.
        //
        // Quando estava, o service worker servia-o de cache a cada navegação.
        // Ao publicar uma versão nova, o browser recebia o HTML antigo — que
        // aponta para `index-<hash>.js` que já não existe no servidor nem na
        // cache, porque o service worker novo já a tinha limpado. A página não
        // desenhava nada e ficava no círculo a rodar para sempre.
        //
        // Passa a ir sempre à rede buscar o HTML, com a cópia em cache só como
        // recurso para quando não há rede. É o que mantém a promessa de abrir
        // sem net sem voltar a servir uma versão morta.
        navigateFallback: null,
        // As chamadas ao Base44 nunca são servidas de cache: dados do pátio
        // fora de prazo são piores do que dados em falta.
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'atlas-shell',
              // Cinco segundos: passado isso assume-se que não há rede e
              // serve-se a cópia guardada, em vez de deixar o ecrã em branco.
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 1 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ]
});