// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // 1. Mode Kompatibilitas Nuxt 4
  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // 2. Modul
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n'
  ],

  // 3. Konfigurasi i18n
  i18n: {
    strategy: 'prefix_except_default',
    defaultLocale: 'id',
    lazy: false,
    langDir: 'locales',
    locales: [
      { code: 'id', name: 'Indonesia', file: 'id.json', iso: 'id-ID' },
      { code: 'en', name: 'English', file: 'en.json', iso: 'en-US' }
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    }
  },

  // 4. Konfigurasi Color Mode
  colorMode: {
    classSuffix: ''
  },

  // 5. Build
  build: {
    transpile: ['chart.js']
  },
  
  // 6. TypeScript
  typescript: {
    shim: false
  },

  // [FIX] 7. Konfigurasi Vite untuk mengizinkan Ngrok
  vite: {
    server: {
      allowedHosts: [
        'adf2c3843988.ngrok-free.app', // Host spesifik Anda
        'localhost',
        '127.0.0.1'
      ]
      // Atau jika ingin mengizinkan semua (untuk dev):
      // allowedHosts: true
    }
  }
})