<script setup lang="ts">
import { ref, computed } from 'vue'
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

// Inisialisasi
const { startLoading, stopLoading } = useGlobalLoading()
const toast = useToast()
const { t } = useI18n()

// State
const userCookie = useCookie<any>('user_data')
const { data: categories, pending, refresh, error } = await useFetch('/api/categories')
const { data: users } = await useFetch('/api/users')
const searchQuery = ref('')

// Admin check
const isAdmin = computed(() => userCookie.value?.role === 'admin')

// Modal states
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)

const selectedCategory = ref<any>(null)

const form = ref({
  name: '',
  inChargeId: '' as string | number
})

// Computed
const filteredCategories = computed(() => {
  if (!categories.value) return []
  return categories.value.filter((cat: any) =>
    cat.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    cat.inCharge?.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// Actions
const closeModals = () => {
  showCreateModal.value = false
  showEditModal.value = false
  showDeleteConfirm.value = false
  form.value = { name: '', inChargeId: '' }
  selectedCategory.value = null
}

// Create
const handleCreate = async () => {
  if (!isAdmin.value) return
  if (!form.value.name.trim() || !form.value.inChargeId) {
    return toast.warning(t('categories.messages.validation_error'))
  }

  startLoading(t('categories.messages.create_process'))
  try {
    await $fetch('/api/categories/create', {
      method: 'POST',
      body: { name: form.value.name, inChargeId: form.value.inChargeId }
    })
    await refresh()
    closeModals()
    await stopLoading()
    toast.success(t('categories.messages.create_success'))
  } catch (e: any) {
    await stopLoading()
    toast.error(e.data?.message || t('categories.messages.create_error'))
  }
}

// Edit
const openEdit = (cat: any) => {
  selectedCategory.value = cat
  form.value = { name: cat.name, inChargeId: cat.inChargeId || '' }
  showEditModal.value = true
}
const handleUpdate = async () => {
  if (!isAdmin.value) return
  startLoading(t('categories.messages.update_process'))
  try {
    await $fetch(`/api/categories/${selectedCategory.value.id}`, {
      method: 'PUT',
      body: { name: form.value.name, inChargeId: form.value.inChargeId }
    })
    await refresh()
    closeModals()
    await stopLoading()
    toast.success(t('categories.messages.update_success'))
  } catch (e: any) {
    await stopLoading()
    toast.error(e.data?.message || t('categories.messages.update_error'))
  }
}

// Delete
const openDelete = (cat: any) => {
  selectedCategory.value = cat
  cat
  showDeleteConfirm.value = true
}
const handleDelete = async () => {
  if (!isAdmin.value) return
  startLoading(t('categories.messages.delete_process'))
  try {
    await $fetch(`/api/categories/${selectedCategory.value.id}`, { method: 'DELETE' })
    await refresh()
    closeModals()
    await stopLoading()
    toast.success(t('categories.messages.delete_success'))
  } catch (e: any) {
    await stopLoading()
    toast.error(e.data?.message || t('categories.messages.delete_error'))
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950/20 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
        <div class="space-y-2">
          <h1 class="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
             {{ $t('categories.title') }}
          </h1>
          <p class="text-base text-gray-600 dark:text-gray-400">{{ $t('categories.subtitle') }}</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <!-- Search -->
          <div class="relative group">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg class="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="$t('categories.search_placeholder')"
              class="w-full sm:w-80 pl-12 pr-5 py-3.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-transparent shadow-lg shadow-indigo-500/5 dark:shadow-purple-500/10 transition-all duration-300 placeholder-gray-400"
            />
          </div>

          <!-- Add Button -->
          <button
            v-if="isAdmin"
            @click="showCreateModal = true"
            class="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-7 py-3.5 rounded-2xl shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/40 transition-all duration-300 flex items-center gap-3"
          >
            <span class="relative z-10 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              {{ $t('categories.add_btn') }}
            </span>
            <div class="absolute inset-0 bg-white/20 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-700"></div>
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-8 p-5 bg-red-500/10 border border-red-500/30 backdrop-blur-md rounded-2xl text-red-600 dark:text-red-400 text-center">
        {{ t('common.loading') }} error.
      </div>

      <!-- Table Card -->
      <div class="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl border border-white/20 dark:border-gray-800/50 rounded-3xl shadow-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-gradient-to-r from-indigo-600/10 to-purple-600/10 dark:from-indigo-500/5 dark:to-purple-500/5">
                <th class="px-8 py-6 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">No.</th>
                <th class="px-8 py-6 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{{ $t('categories.table.name') }}</th>
                <th class="px-8 py-6 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{{ $t('categories.table.pic') }}</th>
                <th v-if="isAdmin" class="px-8 py-6 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{{ $t('categories.table.action') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200/50 dark:divide-gray-800">
              <!-- Loading -->
              <tr v-if="pending">
                <td :colspan="isAdmin ? 4 : 3" class="px-8 py-20 text-center">
                  <div class="flex justify-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600"></div>
                  </div>
                  <p class="mt-4 text-gray-500 dark:text-gray-400">{{ $t('common.loading') }}...</p>
                </td>
              </tr>

              <!-- Empty -->
              <tr v-else-if="filteredCategories.length === 0">
                <td :colspan="isAdmin ? 4 : 3" class="px-8 py-20 text-center text-gray-400 dark:text-gray-500 text-lg">
                  <svg class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h10m-10 4h7m-7 4h4m5 5H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2z" />
                  </svg>
                  {{ $t('categories.table.empty') }}
                </td>
              </tr>

              <!-- Rows -->
              <tr
                v-for="(cat, index) in filteredCategories"
                :key="cat.id"
                class="hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 group"
              >
                <td class="px-8 py-6 text-center text-gray-500 dark:text-gray-400 font-medium">{{ index + 1 }}</td>

                <td class="px-8 py-6">
                  <span class="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-700/50">
                    {{ cat.name }}
                  </span>
                </td>

                <!-- Hanya nama penanggung jawab, tanpa role -->
                <td class="px-8 py-6">
                  <div v-if="cat.inCharge" class="flex items-center gap-3">
                    <div class="relative">
                      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {{ cat.inCharge.name.charAt(0).toUpperCase() }}
                      </div>
                      <div class="absolute inset-0 rounded-full animate-ping bg-indigo-400 opacity-20"></div>
                    </div>
                    <div class="font-medium text-gray-900 dark:text-gray-100">
                      {{ cat.inCharge.name }}
                    </div>
                  </div>
                  <span v-else class="text-sm text-gray-400 italic">{{ $t('categories.table.pic_none') }}</span>
                </td>

                <!-- Actions -->
                <td v-if="isAdmin" class="px-8 py-6 text-center">
                  <div class="flex justify-center gap-3">
                    <button
                      @click="openEdit(cat)"
                      class="p-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl transition-all duration-200 hover:scale-110 shadow-md"
                      :title="$t('common.edit')"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      @click="openDelete(cat)"
                      class="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl transition-all duration-200 hover:scale-110 shadow-md"
                      :title="$t('common.delete')"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Backdrop -->
    <Transition
      enter-active-class="transition duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showCreateModal || showEditModal || showDeleteConfirm" class="fixed inset-0 bg-black/60 backdrop-blur-md z-40" @click="closeModals"></div>
    </Transition>

    <!-- Create / Edit Modal -->
    <Transition
      enter-active-class="transition duration-400 ease-out"
      enter-from-class="opacity-0 scale-90 -translate-y-10"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-90 translate-y-10"
    >
      <div v-if="showCreateModal || showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 w-full max-w-md overflow-hidden">
          <div class="p-8">
            <div class="flex justify-between items-center mb-8">
              <h3 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                {{ showCreateModal ? $t('categories.modal.create_title') : $t('categories.modal.edit_title') }}
              </h3>
              <button @click="closeModals" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form @submit.prevent="showCreateModal ? handleCreate() : handleUpdate()" class="space-y-6">
              <div>
                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{{ $t('categories.modal.name_label') }}</label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  class="w-full px-5 py-4 bg-gray-50/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all"
                  :placeholder="$t('categories.modal.name_placeholder')"
                />
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{{ $t('categories.modal.pic_label') }}</label>
                <select
                  v-model="form.inChargeId"
                  required
                  class="w-full px-5 py-4 bg-gray-50/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all"
                >
                  <option value="" disabled>{{ $t('categories.modal.pic_select') }}</option>
                  <option v-for="u in users" :key="u.id" :value="u.id">
                    {{ u.name }}  <!-- Hanya nama, tanpa role -->
                  </option>
                </select>
              </div>

              <div class="flex gap-4 pt-4">
                <button type="button" @click="closeModals" class="flex-1 py-4 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  {{ $t('common.cancel') }}
                </button>
                <button type="submit" class="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                  {{ showCreateModal ? $t('common.save') : $t('common.update') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Delete Modal -->
    <Transition
      enter-active-class="transition duration-400 ease-out"
      enter-from-class="opacity-0 scale-90"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-90"
    >
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 max-w-sm w-full p-8 text-center">
          <div class="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-4xl">
            Trash Icon
          </div>
          <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">{{ $t('categories.modal.delete_title') }}</h3>
          <p class="text-gray-600 dark:text-gray-300 mb-2">
            Kategori <span class="font-bold text-red-600 dark:text-red-400">{{ selectedCategory?.name }}</span> akan dihapus permanen.
          </p>
          <p class="text-sm text-red-600 dark:text-red-400 font-medium">{{ $t('categories.modal.delete_warn') }}</p>

          <div class="flex gap-4 mt-8">
            <button @click="closeModals" class="flex-1 py-4 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              {{ $t('common.cancel') }}
            </button>
            <button @click="handleDelete" class="flex-1 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
              {{ $t('common.delete') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@keyframes ping {
  75%, 100% { transform: scale(1.1); opacity: 0; }
}
.animate-ping {
  animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
</style>