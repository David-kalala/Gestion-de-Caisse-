import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Vite config complète avec proxy API pour le dev.
 *
 * Astuce d’usage :
 * - Pour utiliser le proxy (et éviter le CORS), faites pointer vos appels API vers des chemins relatifs
 *   (ex: "/auth", "/operations", "/admin"...). Dans ce cas, mettez VITE_API_URL="" dans un .env.development.
 * - Sinon, si vous gardez une URL absolue (ex: http://localhost:4000) dans VITE_API_URL, Vite ne proxyfiera pas
 *   (mais votre backend CORS est déjà configuré, donc ça fonctionne quand même).
 */

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Cible du backend en dev (modifiable via VITE_API_PROXY_TARGET)
  const API_TARGET = env.VITE_API_PROXY_TARGET || 'http://localhost:4000'

  return {
    plugins: [vue()],

    // Expose éventuellement des variables build-time si besoin:
    // define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version) },

    server: {
      port: 5173,
      open: true,
      // Proxy des routes backend (uniquement si les requêtes partent sur des chemins relatifs)
      proxy: {
        '/auth': {
          target: API_TARGET,
          changeOrigin: true,
          secure: false,
        },
        '/admin': {
          target: API_TARGET,
          changeOrigin: true,
          secure: false,
        },
        '/operations': {
          target: API_TARGET,
          changeOrigin: true,
          secure: false,
        },
        '/kpi': {
          target: API_TARGET,
          changeOrigin: true,
          secure: false,
        },
        '/history': {
          target: API_TARGET,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    // Port de preview (build preview)
    preview: {
      port: 4173,
      proxy: {
        // Même mapping possible si vous servez un backend en parallèle pendant un preview
        '/auth': { target: API_TARGET, changeOrigin: true, secure: false },
        '/admin': { target: API_TARGET, changeOrigin: true, secure: false },
        '/operations': { target: API_TARGET, changeOrigin: true, secure: false },
        '/kpi': { target: API_TARGET, changeOrigin: true, secure: false },
        '/history': { target: API_TARGET, changeOrigin: true, secure: false },
      },
    },

    build: {
      sourcemap: true, // utile en débogage
      // outDir: 'dist', // par défaut
    },
  }
})
