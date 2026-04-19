import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

import { generateMigrations } from './scripts/generate_migrations.js'

function migrationsPlugin() {
  return {
    name: 'migrations-generator',
    configResolved() {
      generateMigrations()
    },
    handleHotUpdate({ file }) {
      if (file.includes('database/migrations')) {
        generateMigrations()
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    migrationsPlugin()
  ],
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().getFullYear().toString()),
    __APP_VERSION__: JSON.stringify('v' + new Date().getFullYear().toString() + '.' + (new Date().getMonth()+1).toString().padStart(2, '0') + '.' + new Date().getDate().toString().padStart(2, '0') + '.' + new Date().getHours().toString().padStart(2, '0') + new Date().getMinutes().toString().padStart(2, '0'))
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "@/styles/core/tools" as *;
        `
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500, // Phaser pesa ~1.3MB, evitamos el warning
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) {
            return 'vendor-phaser';
          }
          if (id.includes('node_modules/vue') || id.includes('node_modules/pinia') || id.includes('node_modules/vue-router')) {
            return 'vendor-vue';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-db';
          }
        }
      }
    }
  }
})
