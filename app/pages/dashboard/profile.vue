<script setup lang="ts">
import { ref, computed, watch } from 'vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

// 1. Inisialisasi Global Loading, Toast, & i18n
const { startLoading, stopLoading } = useGlobalLoading()
const toast = useToast()
const { t } = useI18n() // Hook Translate

// 2. Data User
const userCookie = useCookie<any>('user_data')
// Gunakan computed dengan default value agar aman
const user = computed(() => userCookie.value || { id: 0, name: 'Guest', email: '', photoProfile: null })

// 3. State Form
const form = ref({
  name: '',
  email: '',
  photoFile: null as File | null
})

const previewUrl = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// 4. Sync data awal saat halaman dimuat
watch(user, (newVal) => {
  if (newVal.id) {
    form.value.name = newVal.name
    form.value.email = newVal.email
  }
}, { immediate: true })

// 5. Actions
const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileChange = (event: any) => {
  const file = event.target.files[0]
  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      // Reset input jika file terlalu besar
      event.target.value = null
      return toast.warning(t('profile.messages.size_error'))
    }
    form.value.photoFile = file
    previewUrl.value = URL.createObjectURL(file)
  }
}

const handleUpdate = async () => {
  if (!user.value.id) return
  
  // Gunakan t() untuk pesan loading dinamis
  startLoading(t('profile.messages.process'))
  
  // Gunakan FormData untuk kirim File + Text
  const formData = new FormData()
  formData.append('id', user.value.id)
  formData.append('name', form.value.name)
  // Email tetap dikirim untuk validasi backend, meski di UI disabled
  formData.append('email', form.value.email)
  
  if (form.value.photoFile) {
    formData.append('photo', form.value.photoFile)
  }

  try {
    const response: any = await $fetch('/api/profile/update', {
      method: 'PUT',
      body: formData
    })

    // Update Cookie dengan data terbaru dari server
    userCookie.value = response.user
    
    toast.success(t('profile.messages.success'))
    
    // Reset state file
    form.value.photoFile = null
    // previewUrl dibiarkan agar user melihat foto barunya
    
    await stopLoading()

  } catch (err: any) {
    await stopLoading()
    toast.error(err.data?.message || t('profile.messages.error'))
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950/30 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
      
      <div class="mb-8">
        <h1 class="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
          {{ $t('profile.title') }}
        </h1>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {{ $t('profile.subtitle') }}
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        
        <div class="md:col-span-1">
          <div class="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl p-6 rounded-2xl shadow-xl border border-white/20 dark:border-gray-800/50 text-center transition-all duration-300 hover:shadow-2xl">
            
            <div 
              class="relative group mx-auto w-32 h-32 cursor-pointer mb-4" 
              @click="triggerFileInput"
              title="Klik untuk mengganti foto"
            >
              <div class="w-full h-full rounded-full overflow-hidden border-4 border-white/50 dark:border-gray-600/50 shadow-lg bg-gray-100/50 dark:bg-gray-700/50 flex items-center justify-center transition-all duration-300 group-hover:border-indigo-500/50 dark:group-hover:border-indigo-400/50 group-hover:scale-105">
                
                <img v-if="previewUrl" :src="previewUrl" class="w-full h-full object-cover" />
                
                <img v-else-if="user.photoProfile" :src="user.photoProfile" class="w-full h-full object-cover" />
                
                <div v-else class="text-5xl font-bold text-indigo-500 dark:text-indigo-400">
                  {{ user.name?.charAt(0).toUpperCase() }}
                </div>
              </div>

              <div class="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>

            <input 
              ref="fileInput" 
              type="file" 
              accept="image/png, image/jpeg, image/jpg" 
              class="hidden" 
              @change="handleFileChange"
            />

            <h2 class="font-bold text-gray-900 dark:text-white text-xl mt-4">{{ user.name }}</h2>
            <span class="inline-block bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/40 text-indigo-700 dark:text-indigo-300 text-xs px-3 py-1 rounded-full mt-2 capitalize shadow-sm">
              {{ user.role?.name || user.role || 'User' }}
            </span>
          </div>
        </div>

        <div class="md:col-span-2">
          <div class="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl p-6 rounded-2xl shadow-xl border border-white/20 dark:border-gray-800/50 transition-all duration-300 hover:shadow-2xl">
            <h3 class="font-semibold text-gray-900 dark:text-white text-xl mb-6 border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
              {{ $t('profile.edit_info') }}
            </h3>
            
            <form @submit.prevent="handleUpdate" class="space-y-6">
              
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {{ $t('profile.name_label') }}
                </label>
                <input 
                  v-model="form.name" 
                  type="text" 
                  required 
                  class="w-full px-4 py-3 border border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-800/80 rounded-xl focus:ring-2 focus:ring-indigo-500/40 outline-none transition-all duration-300 shadow-sm hover:shadow-md text-sm"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {{ $t('profile.email_label') }}
                  <span class="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1">{{ $t('profile.email_hint') }}</span>
                </label>
                <div class="relative">
                  <input 
                    v-model="form.email" 
                    type="email" 
                    disabled
                    class="w-full px-4 py-3 border border-gray-200/60 dark:border-gray-700/60 bg-gray-50/80 dark:bg-gray-700/80 text-gray-500 dark:text-gray-400 rounded-xl cursor-not-allowed outline-none transition-all duration-300 shadow-sm text-sm"
                  />
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div class="flex justify-end pt-2">
                <button 
                  type="submit" 
                  class="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-sm font-medium"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {{ $t('profile.btn_save') }}
                  <div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>