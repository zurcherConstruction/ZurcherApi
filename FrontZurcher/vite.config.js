import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimizaciones para SEO y Performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendor code para mejor caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'ui-vendor': ['react-hot-toast', 'sweetalert2', 'react-toastify'],
          'charts-vendor': ['chart.js', 'react-chartjs-2', 'recharts'],
        },
      },
    },
    // Minificación para mejor performance
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remover console.logs en producción
        drop_debugger: true,
      },
    },
    // Optimizar chunks
    chunkSizeWarningLimit: 1000,
    // Sourcemaps solo para debugging (no en producción)
    sourcemap: false,
    // Optimizar assets
    assetsInlineLimit: 4096, // Inline assets < 4kb como base64
  },
  // Optimización de dependencias
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  // Server config para desarrollo
  server: {
    port: 5173,
    strictPort: false,
    hmr: {
      overlay: true,
    },
  },
})