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

  // 3. Konfigurasi i18n (FIXED)
  i18n: {
    // Menggunakan strategi 'no_prefix' agar URL tetap bersih 
    // dan bahasa bergantung sepenuhnya pada cookie/state.
    // Jika Anda ingin URL seperti /en/login, ubah kembali ke 'prefix_except_default'
    strategy: 'no_prefix', 
    
    defaultLocale: 'id',
    lazy: false, // Load semua locale di awal agar transisi instan
    langDir: 'locales',
    locales: [
      { code: 'id', name: 'Indonesia', file: 'id.json', iso: 'id-ID' },
      { code: 'en', name: 'English', file: 'en.json', iso: 'en-US' }
    ],
    
    // Konfigurasi deteksi bahasa yang lebih persisten
    detectBrowserLanguage: {
      useCookie: true,            // Wajib true agar pilihan user tersimpan
      cookieKey: 'i18n_redirected', // Nama cookie
      redirectOn: 'root',         // Hanya redirect di root jika belum ada cookie
      alwaysRedirect: false,      // PENTING: Set false agar tidak memaksa redirect setiap navigasi
      fallbackLocale: 'id'
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

  // 7. Konfigurasi Vite
  vite: {
    server: {
      allowedHosts: [
        'adf2c3843988.ngrok-free.app',
        'localhost',
        '127.0.0.1'
      ]
    }
  }
})