<script setup lang="ts">
import { ref, onMounted } from 'vue'

// Konfigurasi Halaman
definePageMeta({
  layout: 'default',
  middleware: 'auth' // FIX: Gunakan guest agar tidak loop redirect
})

const { startLoading, stopLoading } = useGlobalLoading()
const toast = useToast()
const { t } = useI18n()
const router = useRouter()

// Cek jika user sudah login, langsung lempar ke dashboard
const userCookie = useCookie('user_data')
if (userCookie.value) {
  navigateTo('/dashboard')
}

// State Form
const email = ref('')
const password = ref('')
const fullName = ref('') // Untuk Sign Up
const showPassword = ref(false)
const errorMessage = ref('')
const isSubmitting = ref(false)
const agreeTerms = ref(false) // Untuk Sign Up

// State Tampilan (Login vs Sign Up)
const isLoginView = ref(true)

// Background Grid Image (Secure)
const gridBgImage = `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='none'/%3E%3Cpath d='M60 0v60H0V0z' stroke='%23000' stroke-width='1' fill='none'/%3E%3C/svg%3E")`

// Animation Trigger
const isVisible = ref(false)
onMounted(() => {
  setTimeout(() => {
    isVisible.value = true
  }, 100)
})

// Toggle View Function
const toggleView = () => {
  isLoginView.value = !isLoginView.value
  errorMessage.value = ''
  email.value = ''
  password.value = ''
  fullName.value = ''
  agreeTerms.value = false
}

// Fungsi Login
const handleLogin = async () => {
  isSubmitting.value = true
  startLoading(t('login.loading'))
  errorMessage.value = ''

  try {
    const response: any = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })

    const tokenCookie = useCookie('auth_token', { maxAge: 86400, path: '/' })
    const userDataCookie = useCookie('user_data', { maxAge: 86400, path: '/' })
    
    tokenCookie.value = response.token || ('logged-in-' + Date.now())
    userDataCookie.value = response.user

    await stopLoading()
    isSubmitting.value = false
    toast.success('Login berhasil!')
    
    // FIX: Gunakan router.push untuk navigasi SPA yang mulus
    router.push('/dashboard')

  } catch (err: any) {
    console.error('Login Error:', err)
    await stopLoading()
    isSubmitting.value = false
    errorMessage.value = err.data?.message || err.data?.statusMessage || t('login.error_default')
  }
}

// Fungsi Sign Up (Simulasi)
const handleSignUp = async () => {
  if (!agreeTerms.value) {
    toast.warning('Anda harus menyetujui syarat dan ketentuan.')
    return
  }

  isSubmitting.value = true
  startLoading('Mendaftarkan akun...')
  errorMessage.value = ''

  try {
    // Simulasi API Call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    await stopLoading()
    isSubmitting.value = false
    toast.success('Pendaftaran berhasil! Silakan login.')
    
    // Kembali ke tampilan login
    toggleView()

  } catch (err: any) {
    await stopLoading()
    isSubmitting.value = false
    errorMessage.value = 'Gagal mendaftar. Silakan coba lagi.'
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950 px-4 py-12">
    
    <div class="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-float"></div>
      <div class="absolute bottom-1/4 -right-20 w-80 h-80 bg-gradient-to-r from-purple-400/15 to-pink-400/15 rounded-full blur-3xl animate-float-delay"></div>
      
      <div class="absolute inset-0 opacity-5 dark:opacity-10">
        <div class="absolute inset-0" :style="{ backgroundImage: gridBgImage }"></div>
      </div>
    </div>

    <div class="absolute top-6 left-6 z-30 animate-fade-in-down">
      <NuxtLink to="/" class="group flex items-center gap-2 px-4 py-2.5 bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/60 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-cyan-400">
        <svg class="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>{{ $t('login.back_home') }}</span>
      </NuxtLink>
    </div>

    <div class="absolute top-6 right-6 z-30 flex items-center gap-3 animate-fade-in-down">
      <LanguageSwitcher />
      <ThemeToggle />
    </div>

    <div class="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
      
      <div class="hidden lg:flex flex-col justify-center p-8">
        <div class="space-y-8">
          <div>
            <div class="mb-6 inline-block">
              <img src="/logo.png" alt="Logo" class="h-16 w-auto drop-shadow-lg" />
            </div>
            <h1 class="text-5xl font-bold leading-tight mb-4">
              <span class="bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 bg-clip-text text-transparent">Study Online,</span><br>
              <span class="text-gray-800 dark:text-white">Learn Online</span>
            </h1>
            <p class="text-xl text-gray-600 dark:text-gray-300 mb-6">
              Learn From World's Best Instructors Around The World.
            </p>
          </div>

          <div class="space-y-6">
            <div class="flex items-start gap-4">
              <div class="mt-1 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              </div>
              <div>
                <h3 class="font-semibold text-gray-800 dark:text-white">World-Class Instructors</h3>
                <p class="text-gray-600 dark:text-gray-400">Learn from industry experts.</p>
              </div>
            </div>

            <div class="flex items-start gap-4">
              <div class="mt-1 p-2 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
              <div>
                <h3 class="font-semibold text-gray-800 dark:text-white">Secure Learning</h3>
                <p class="text-gray-600 dark:text-gray-400">Your data is protected.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-center p-4">
        <div class="w-full max-w-md">
          <div class="relative group">
            <div class="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-800/50 overflow-hidden transition-all duration-500">
              
              <div class="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              <div class="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-transparent to-cyan-600/20 opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-1000"></div>

              <div class="relative p-8 sm:p-10">
                
                <div class="flex mb-8 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                  <button
                    @click="isLoginView = true"
                    :class="['flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300', isLoginView ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-cyan-400 shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200']"
                  >
                    Sign In
                  </button>
                  <button
                    @click="isLoginView = false"
                    :class="['flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300', !isLoginView ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-cyan-400 shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200']"
                  >
                    Create Account
                  </button>
                </div>

                <div class="text-center mb-8 animate-slide-down">
                  <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {{ isLoginView ? $t('login.title') : 'Create an Account' }}
                  </h2>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ isLoginView ? $t('login.subtitle') : 'Join us and start learning today.' }}
                  </p>
                </div>

                <Transition name="slide-down">
                  <div v-if="errorMessage" class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-start gap-3 animate-shake">
                    <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span class="font-medium">{{ errorMessage }}</span>
                  </div>
                </Transition>

                <form @submit.prevent="isLoginView ? handleLogin() : handleSignUp()" class="space-y-5">
                  
                  <Transition name="fade">
                    <div v-if="!isLoginView" class="group">
                      <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Full Name</label>
                      <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        </div>
                        <input v-model="fullName" type="text" required class="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-white placeholder-gray-400" placeholder="John Doe" />
                      </div>
                    </div>
                  </Transition>

                  <div class="group animate-slide-up delay-100">
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">{{ $t('login.email') }}</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      </div>
                      <input v-model="email" type="email" required class="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-white placeholder-gray-400" :placeholder="isLoginView ? 'admin@sikap.com' : 'student@email.com'" />
                    </div>
                  </div>

                  <div class="group animate-slide-up delay-200">
                    <div class="flex justify-between items-center mb-2">
                      <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{{ $t('login.password') }}</label>
                      <NuxtLink v-if="isLoginView" to="/forgot-password" class="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors">
                        {{ $t('login.forgot_pass') }}
                      </NuxtLink>
                    </div>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                      </div>
                      <input v-model="password" :type="showPassword ? 'text' : 'password'" required class="w-full pl-12 pr-12 py-3.5 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-white placeholder-gray-400" placeholder="••••••••" :minlength="isLoginView ? 6 : 8" />
                      <button type="button" @click="showPassword = !showPassword" class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-600 dark:hover:text-cyan-400 transition-colors focus:outline-none">
                        <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.574-2.59M6 6l12 12 M17.94 17.94A10.07 10.07 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 012.433-3.633"/></svg>
                      </button>
                    </div>
                  </div>

                  <Transition name="fade">
                    <div v-if="!isLoginView" class="flex items-start gap-3 animate-slide-up delay-300">
                      <div class="flex items-center h-5">
                        <input v-model="agreeTerms" id="terms" type="checkbox" required class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600" />
                      </div>
                      <label for="terms" class="text-xs text-gray-600 dark:text-gray-400">
                        I agree to the <a href="#" class="text-blue-600 hover:underline">Terms</a> and <a href="#" class="text-blue-600 hover:underline">Privacy Policy</a>.
                      </label>
                    </div>
                  </Transition>

                  <button 
                    type="submit" 
                    :disabled="isSubmitting || (!isLoginView && !agreeTerms)"
                    class="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed animate-slide-up delay-300 group"
                  >
                    <span class="relative z-10 flex items-center gap-2">
                      <span v-if="!isSubmitting">{{ isLoginView ? $t('login.btn_submit') : 'Create Account' }}</span>
                      <span v-else>{{ $t('login.loading') }}</span>
                      <svg v-if="!isSubmitting" class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                      <svg v-else class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    </span>
                  </button>

                </form>

                <div class="relative my-8">
                  <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  <div class="relative flex justify-center text-xs uppercase">
                    <span class="bg-white dark:bg-gray-900 px-2 text-gray-500">Or continue with</span>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <button type="button" class="flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    GitHub
                  </button>
                  <button type="button" class="flex items-center justify-center gap-2 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
                    <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M23.954 11.629c-.885.389-1.83.654-2.825.775 1.014-.611 1.794-1.574 2.163-2.723-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-2.717 0-4.92 2.203-4.92 4.917 0 .39.045.765.127 1.124C7.691 14.816 4.066 12.89 1.64 10.026c-.427.722-.666 1.561-.666 2.475 0 1.71.87 3.213 2.188 4.096-.807-.026-1.566-.248-2.228-.616v.061c0 2.385 1.693 4.374 3.946 4.827-.413.111-.849.171-1.296.171-.314 0-.615-.03-.916-.086.631 1.953 2.445 3.377 4.604 3.417-1.68 1.319-3.809 2.105-6.102 2.105-.397 0-.79-.023-1.177-.067 2.179 1.397 4.768 2.212 7.548 2.212 9.054 0 14.002-7.496 14.002-13.986 0-.209 0-.42-.015-.63.961-.689 1.8-1.56 2.46-2.548l-.047-.02z"/></svg>
                    Twitter
                  </button>
                </div>

                <p class="mt-8 text-center text-xs text-gray-400">
                  © 2025 SIKAP App. {{ $t('login.rights_reserved') || 'All rights reserved.' }}
                </p>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div v-for="i in 20" :key="i" 
        :style="{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${10 + Math.random() * 20}s`
        }"
        class="absolute w-1 h-1 bg-blue-400/20 dark:bg-cyan-400/20 rounded-full animate-float-particle"
      ></div>
    </div>
  </div>
</template>

<style scoped>
/* Modern Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes float-orb {
  0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
  50% { transform: translateY(-40px) translateX(20px) rotate(5deg); }
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.05); }
}

@keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slide-down { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes shake { 0%,100%{transform:translateX(0)} 10%,30%,50%,70%,90%{transform:translateX(-8px)} 20%,40%,60%,80%{transform:translateX(8px)} }

@keyframes float-particle {
  0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0.2; }
  25% { transform: translateY(-50px) translateX(20px) rotate(90deg); opacity: 0.4; }
  50% { transform: translateY(-100px) translateX(-20px) rotate(180deg); opacity: 0.2; }
  75% { transform: translateY(-50px) translateX(10px) rotate(270deg); opacity: 0.4; }
}

.animate-fade-in-up { animation: fadeIn 1s cubic-bezier(0.22, 0.61, 0.36, 1) forwards; }
.animate-fade-in-down { animation: slide-down 1s cubic-bezier(0.22, 0.61, 0.36, 1) forwards; }
.animate-float-orb { animation: float-orb 28s ease-in-out infinite; }
.animate-pulse-glow { animation: pulse-glow 12s ease-in-out infinite; }
.animate-slide-up { animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-slide-down { animation: slide-down 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-shake { animation: shake 0.6s ease-out; }
.animate-float-particle { animation: float-particle linear infinite; }

.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.delay-300 { animation-delay: 0.3s; }
.delay-400 { animation-delay: 0.4s; }
.delay-500 { animation-delay: 0.5s; }
.delay-3000 { animation-delay: 3s; }

.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-10px); }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.3s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-10px); }

* { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

/* Custom scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.05); }
::-webkit-scrollbar-thumb { background: linear-gradient(to bottom, #3b82f6, #06b6d4); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: linear-gradient(to bottom, #2563eb, #0891b2); }
</style>