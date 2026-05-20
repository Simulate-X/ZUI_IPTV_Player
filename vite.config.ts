import { webcrypto } from 'node:crypto'
// Node 16 polyfill: Vite 5 uses Web Crypto API internally
if (!globalThis.crypto) {
  (globalThis as { crypto?: unknown }).crypto = webcrypto
}

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2019',
    outDir: 'dist',
    minify: 'terser',
    sourcemap: false,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom'],
          'vendor-player': ['hls.js', 'mpegts.js'],
          'vendor-state':  ['zustand', 'idb'],
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0'),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().split('T')[0]),
  },
})
