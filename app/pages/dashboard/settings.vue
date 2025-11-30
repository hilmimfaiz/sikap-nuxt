<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

// 1. Inisialisasi Global Loading, Toast, & i18n
const { startLoading, stopLoading } = useGlobalLoading()
const toast = useToast()
const { t } = useI18n() // Hook Translate
const userCookie = useCookie<any>('user_data')

const form = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// --- STATE VISIBILITAS PASSWORD ---
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// --- ACTION ---
const handleChangePassword = async () => {
  // Validasi Sederhana
  if (form.value.newPassword !== form.value.confirmPassword) {
    return toast.warning(t('settings.messages.mismatch'))
  }
  if (form.value.newPassword.length < 6) {
    return toast.warning(t('settings.messages.min_length'))
  }

  startLoading(t('settings.messages.process'))
  try {
    await $fetch('/api/profile/change-password', {
      method: 'PUT',
      body: {
        id: userCookie.value?.id,
        currentPassword: form.value.currentPassword,
        newPassword: form.value.newPassword
      }
    })

    toast.success(t('settings.messages.success'))
    
    // Reset Form
    form.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    await stopLoading()

  } catch (e: any) {
    await stopLoading()
    // Gunakan pesan dari server jika ada, atau fallback ke pesan default terjemahan
    toast.error(e.data?.message || t('settings.messages.error'))
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950/30 py-8 px-4 sm:px-6 lg:px-8">
    
    <div class="max-w-2xl mx-auto">
      
      <div class="mb-8">
        <h1 class="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
          {{ $t('settings.title') }}
        </h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {{ $t('settings.subtitle') }}
        </p>
      </div>

      <div class="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl p-8 rounded-2xl shadow-xl border border-white/20 dark:border-gray-800/50 transition-all duration-300 hover:shadow-2xl">
        <h3 class="font-semibold text-gray-900 dark:text-white text-xl mb-6 border-b border-gray-200/50 dark:border-gray-700/50 pb-4 flex items-center gap-2">
          <svg class="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          {{ $t('settings.change_password') }}
        </h3>

        <form @submit.prevent="handleChangePassword" class="space-y-6">
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('settings.current_pass') }}</label>
            <div class="relative">
              <input 
                v-model="form.currentPassword" 
                :type="showCurrentPassword ? 'text' : 'password'" 
                required
                class="w-full px-4 py-3 border border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-800/80 rounded-xl focus:ring-2 focus:ring-indigo-500/40 outline-none transition-all duration-300 shadow-sm hover:shadow-md text-sm pr-12"
              />
              <button 
                type="button"
                @click="showCurrentPassword = !showCurrentPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none transition-all duration-200 hover:scale-110"
                tabindex="-1"
              >
                <svg v-if="showCurrentPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.574-2.59M6 6l12 12" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
                </svg>
              </button>
            </div>
          </div>

          <hr class="border-gray-200/50 dark:border-gray-700/50 my-4 transition-colors">

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('settings.new_pass') }}</label>
            <div class="relative">
              <input 
                v-model="form.newPassword" 
                :type="showNewPassword ? 'text' : 'password'" 
                required
                class="w-full px-4 py-3 border border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-800/80 rounded-xl focus:ring-2 focus:ring-indigo-500/40 outline-none transition-all duration-300 shadow-sm hover:shadow-md text-sm pr-12"
                placeholder="Minimal 6 karakter"
              />
              <button 
                type="button"
                @click="showNewPassword = !showNewPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none transition-all duration-200 hover:scale-110"
                tabindex="-1"
              >
                <svg v-if="showNewPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.574-2.59M6 6l12 12" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ $t('settings.confirm_pass') }}</label>
            <div class="relative">
              <input 
                v-model="form.confirmPassword" 
                :type="showConfirmPassword ? 'text' : 'password'" 
                required
                class="w-full px-4 py-3 border border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-800/80 rounded-xl focus:ring-2 focus:ring-indigo-500/40 outline-none transition-all duration-300 shadow-sm hover:shadow-md text-sm pr-12"
                placeholder="Ulangi kata sandi baru"
              />
              <button 
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none transition-all duration-200 hover:scale-110"
                tabindex="-1"
              >
                <svg v-if="showConfirmPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.574-2.59M6 6l12 12" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
                </svg>
              </button>
            </div>
          </div>

          <div class="flex justify-end pt-4">
            <button 
              type="submit" 
              class="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-sm font-medium"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {{ $t('settings.btn_save') }}
              <div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>