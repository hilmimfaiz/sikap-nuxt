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
const userCookie = useCookie<any>('user_data')

// Hak Akses
const canManage = computed(() => {
  const role = userCookie.value?.role
  return role === 'admin' || role === 'editor'
})

// Data Fetching
const { data: links, pending, refresh, error } = await useFetch('/api/links')
const { data: categories } = await useFetch('/api/categories')
const searchQuery = ref('')

// Modal States
const showCreateModal = ref(false)
const showImportModal = ref(false)
const showEditModal = ref(false)
const showDeleteConfirm = ref(false)
const showDropdown = ref(false)

// Data Holders
const selectedLink = ref<any>(null)
const importFile = ref<File | null>(null)

const form = ref({
  title: '',
  url: '',
  categoryId: '' as string | number,
  isActive: true
})

// Computed
const filteredLinks = computed(() => {
  if (!links.value) return []
  return links.value.filter((link: any) =>
    link.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    link.category?.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// Actions
const closeModals = () => {
  showCreateModal.value = false
  showImportModal.value = false
  showEditModal.value = false
  showDeleteConfirm.value = false
  showDropdown.value = false
  form.value = { title: '', url: '', categoryId: '', isActive: true }
  selectedLink.value = null
  importFile.value = null
}

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

// TOGGLE STATUS — SUPER RESPONSIF + AUTO REFRESH
const toggleStatus = async (link: any) => {
  if (!canManage.value) return

  const targetLink = links.value?.find((l: any) => l.id === link.id)
  if (!targetLink) return

  const oldStatus = targetLink.isActive
  const newStatus = !oldStatus

  // Optimistic Update — langsung ubah tampilan
  targetLink.isActive = newStatus

  try {
    await $fetch(`/api/links/${link.id}`, {
      method: 'PUT',
      body: { isActive: newStatus }
    })

    // Refresh data agar selalu akurat
    await refresh()

    toast.success(
      newStatus
        ? `✓ ${link.title} diaktifkan`
        : `✕ ${link.title} dinonaktifkan`
    )
  } catch (e: any) {
    // Rollback jika gagal
    targetLink.isActive = oldStatus
    await refresh()
    toast.error('Gagal mengubah status')
  }
}

// Create Manual
const handleCreate = async () => {
  if (!canManage.value) return
  if (!form.value.title || !form.value.url || !form.value.categoryId) {
    return toast.warning(t('links.messages.validation_error'))
  }
  startLoading(t('links.messages.create_process'))
  try {
    await $fetch('/api/links/create', { method: 'POST', body: form.value })
    await refresh()
    closeModals()
    await stopLoading()
    toast.success(t('links.messages.create_success'))
  } catch (e: any) {
    await stopLoading()
    toast.error(e.data?.message || t('links.messages.create_error'))
  }
}

// Import CSV
const onFileChange = (e: any) => {
  const file = e.target.files[0]
  if (file && file.type === 'text/csv') {
    importFile.value = file
  } else {
    toast.warning(t('users.messages.file_format'))
    e.target.value = null
  }
}

const downloadTemplate = () => {
  const csvContent = "Title,Url,Category\nContoh Google,https://google.com,Umum\nSistem Akademik,https://siakad.kampus.ac.id,Akademik"
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'template_links.csv'
  a.click()
  window.URL.revokeObjectURL(url)
  toast.info('Template CSV berhasil diunduh')
}

const downloadMasterCategory = () => {
  window.open('/api/categories/export', '_blank')
  toast.info('Mengunduh daftar kategori...')
}

const handleImport = async () => {
  if (!canManage.value || !importFile.value) return
  startLoading(t('links.messages.import_process'))
  const formData = new FormData()
  formData.append('file', importFile.value)
  try {
    const res: any = await $fetch('/api/links/import', { method: 'POST', body: formData })
    await refresh()
    closeModals()
    await stopLoading()
    toast.success(res.message || t('links.messages.import_success'))
  } catch (e: any) {
    await stopLoading()
    toast.error(e.data?.message || t('links.messages.import_error'))
  }
}

// Edit
const openEdit = (link: any) => {
  if (!canManage.value) return
  selectedLink.value = link
  form.value = {
    title: link.title,
    url: link.url,
    categoryId: link.categoryId,
    isActive: link.isActive
  }
  showEditModal.value = true
}

const handleUpdate = async () => {
  if (!selectedLink.value || !canManage.value) return
  startLoading(t('links.messages.update_process'))
  try {
    await $fetch(`/api/links/${selectedLink.value.id}`, {
      method: 'PUT',
      body: form.value
    })
    await refresh()
    closeModals()
    await stopLoading()
    toast.success(t('links.messages.update_success'))
  } catch (e: any) {
    await stopLoading()
    toast.error(e.data?.message || t('links.messages.update_error'))
  }
}

// Delete
const openDelete = (link: any) => {
  if (!canManage.value) return
  selectedLink.value = link
  showDeleteConfirm.value = true
}

const handleDelete = async () => {
  if (!selectedLink.value || !canManage.value) return
  startLoading(t('links.messages.delete_process'))
  try {
    await $fetch(`/api/links/${selectedLink.value.id}`, { method: 'DELETE' })
    await refresh()
    closeModals()
    await stopLoading()
    toast.success(t('links.messages.delete_success'))
  } catch (e: any) {
    await stopLoading()
    toast.error(e.data?.message || t('links.messages.delete_error'))
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950/30 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto" @click="showDropdown = false">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
        <div class="space-y-2">
          <h1 class="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
           {{ $t('links.title') }}
          </h1>
          <p class="text-base text-gray-600 dark:text-gray-400">{{ $t('links.subtitle') }}</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <!-- Search -->
          <div class="relative group">
            <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="$t('links.search_placeholder')"
              class="w-full sm:w-96 pl-12 pr-5 py-3.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-lg transition-all duration-300"
            />
          </div>

          <!-- Tombol Tambah -->
          <div v-if="canManage" class="relative">
            <button
              @click.stop="toggleDropdown()"
              class="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-8 py-3.5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-3"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              {{ $t('links.add_btn') }}
              <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': showDropdown }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
              <div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>

            <Transition
              enter-active-class="transition ease-out duration-200"
              enter-from-class="opacity-0 -translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition ease-in duration-150"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-2"
            >
              <div v-if="showDropdown" class="absolute right-0 mt-3 w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden z-50">
                <button @click="showCreateModal = true; showDropdown = false" class="w-full text-left px-6 py-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 flex items-center gap-4 transition">
                  <div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl">Pen</div>
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">{{ $t('links.add_manual') }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Tambah satu per satu</p>
                  </div>
                </button>
                <button @click="showImportModal = true; showDropdown = false" class="w-full text-left px-6 py-4 hover:bg-green-50 dark:hover:bg-green-900/40 flex items-center gap-4 border-t border-gray-100 dark:border-gray-800 transition">
                  <div class="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 text-2xl">Chart</div>
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">{{ $t('links.import_csv') }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Import massal via CSV</p>
                  </div>
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-8 p-6 bg-red-500/10 border border-red-500/30 backdrop-blur-md rounded-2xl text-red-600 dark:text-red-400 text-center font-medium">
        Gagal memuat data tautan.
      </div>

      <!-- Table Card -->
      <div class="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-800/50 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-gradient-to-r from-indigo-600/10 to-purple-600/10 dark:from-indigo-500/5 dark:to-purple-500/5">
                <th class="px-8 py-6 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{{ $t('links.table.status') }}</th>
                <th class="px-8 py-6 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{{ $t('links.table.title_url') }}</th>
                <th class="px-8 py-6 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{{ $t('links.table.category') }}</th>
                <th class="px-8 py-6 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{{ $t('links.table.action') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200/50 dark:divide-gray-800">
              <!-- Loading -->
              <tr v-if="pending">
                <td colspan="4" class="px-8 py-24 text-center">
                  <div class="flex justify-center">
                    <div class="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-indigo-600"></div>
                  </div>
                  <p class="mt-6 text-gray-500 dark:text-gray-400">{{ $t('common.loading') }}...</p>
                </td>
              </tr>

              <!-- Empty -->
              <tr v-else-if="filteredLinks.length === 0">
                <td colspan="4" class="px-8 py-24 text-center text-gray-400 dark:text-gray-500 text-lg">
                  <div class="w-20 h-20 mx-auto mb-4 opacity-30">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.5 3h-3m3 18h-3m9-9v-3m-18 3v-3m15 6h3m-18 0h3m12-12l3-3m-15 3l-3-3" />
                    </svg>
                  </div>
                  {{ $t('links.table.empty') }}
                </td>
              </tr>

              <!-- Data Rows -->
              <tr v-for="link in filteredLinks" :key="link.id" class="hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 group">
                <!-- Status Toggle — SUPER RESPONSIF -->
                <td class="px-8 py-6">
                  <button
                    @click="toggleStatus(link)"
                    :disabled="!canManage"
                    class="group/toggle relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
                    :class="link.isActive 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30' 
                      : 'bg-gray-300 dark:bg-gray-700'"
                  >
                    <span
                      class="inline-block h-6 w-6 transform rounded-full bg-white shadow-xl transition-all duration-300 ease-out flex items-center justify-center"
                      :class="link.isActive ? 'translate-x-7' : 'translate-x-1'"
                    >
                      <svg v-if="link.isActive" class="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </span>
                    <span class="absolute inset-0 rounded-full bg-white/30 scale-0 group-active/toggle:scale-150 transition-transform duration-300"></span>
                  </button>
                  <p class="mt-3 text-xs font-semibold" :class="link.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'">
                    {{ link.isActive ? $t('links.table.active') : $t('links.table.inactive') }}
                  </p>
                </td>

                <!-- Title & URL -->
                <td class="px-8 py-6">
                  <p class="font-bold text-gray-900 dark:text-white mb-1">{{ link.title }}</p>
                  <a :href="link.url" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline text-sm flex items-center gap-1 truncate max-w-md">
                    {{ link.url }}
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </td>

                <!-- Category -->
                <td class="px-8 py-6">
                  <span class="inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-700/50">
                    {{ link.category?.name || 'Umum' }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="px-8 py-6 text-center">
                  <div class="flex justify-center gap-3">
                    <a :href="link.url" target="_blank" class="p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all hover:scale-110">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </a>
                    <button v-if="canManage" @click="openEdit(link)" class="p-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl transition-all hover:scale-110">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button v-if="canManage" @click="openDelete(link)" class="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl transition-all hover:scale-110">
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
      <div v-if="showCreateModal || showImportModal || showEditModal || showDeleteConfirm" class="fixed inset-0 bg-black/60 backdrop-blur-md z-40" @click="closeModals"></div>
    </Transition>

    <!-- Modal Create / Edit -->
    <Transition
      enter-active-class="transition duration-500 ease-out"
      enter-from-class="opacity-0 scale-90 -translate-y-10"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-90 translate-y-10"
    >
      <div v-if="showCreateModal || showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 w-full max-w-lg overflow-hidden">
          <div class="p-8">
            <div class="flex justify-between items-center mb-8">
              <h3 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                {{ showCreateModal ? $t('links.modal.create_title') : $t('links.modal.edit_title') }}
              </h3>
              <button @click="closeModals" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form @submit.prevent="showCreateModal ? handleCreate() : handleUpdate()" class="space-y-6">
              <div>
                <label class="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">Judul Tautan</label>
                <input v-model="form.title" type="text" required class="w-full px-5 py-4 bg-gray-50/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-indigo-500/30 transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">URL</label>
                <input v-model="form.url" type="url" required class="w-full px-5 py-4 bg-gray-50/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-indigo-500/30 transition-all" />
              </div>
              <div>
                <label class="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">Kategori</label>
                <select v-model="form.categoryId" required class="w-full px-5 py-4 bg-gray-50/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-indigo-500/30 transition-all">
                  <option value="" disabled>{{ $t('links.modal.category_select') }}</option>
                  <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div class="flex items-center gap-3">
                <input type="checkbox" id="active" v-model="form.isActive" class="w-4 h-4 text-indigo-600 rounded" />
                <label for="active" class="text-sm text-gray-700 dark:text-gray-300">Tampilkan tautan ini</label>
              </div>
              <div class="flex gap-4 pt-6">
                <button type="button" @click="closeModals" class="flex-1 py-4 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition font-medium">Batal</button>
                <button type="submit" class="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                  {{ showCreateModal ? $t('common.save') : $t('common.update') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modal Import CSV -->
    <Transition
      enter-active-class="transition duration-500 ease-out"
      enter-from-class="opacity-0 scale-90"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-90"
    >
      <div v-if="showImportModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 w-full max-w-lg p-8">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-2xl font-bold text-gray-900 dark:text-white">{{ $t('links.modal.import_title') }}</h3>
            <button @click="closeModals" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-5 mb-6 text-sm">
            <p class="font-semibold mb-2">Panduan Import:</p>
            <ul class="list-disc pl-5 space-y-1 text-blue-800 dark:text-blue-300">
              <li>Kolom wajib: <strong>Title, Url, Category</strong></li>
              <li>Nama kategori harus sama persis</li>
            </ul>
          </div>

          <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-10 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition relative cursor-pointer">
            <input type="file" accept=".csv" @change="onFileChange" class="absolute inset-0 opacity-0 cursor-pointer" />
            <div v-if="!importFile">
              <div class="text-5xl mb-3 opacity-60">Document</div>
              <p class="font-medium text-gray-700 dark:text-gray-300">Klik atau seret file CSV ke sini</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Maksimal 5MB</p>
            </div>
            <div v-else class="text-green-500">
              <div class="text-5xl mb-3">Check</div>
              <p class="font-medium text-gray-900 dark:text-white">{{ importFile.name }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ (importFile.size / 1024).toFixed(2) }} KB</p>
              <button @click.stop="importFile = null" class="text-xs text-red-500 hover:underline mt-2">Hapus</button>
            </div>
          </div>

          <div class="mt-8 flex flex-col sm:flex-row justify-between gap-4">
            <div class="space-y-2">
              <button @click="downloadTemplate" class="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2">
                Download Template CSV
              </button>
              <button @click="downloadMasterCategory" class="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-2">
                Download Daftar Kategori
              </button>
            </div>
            <button @click="handleImport" :disabled="!importFile" class="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              Mulai Import
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modal Delete Confirm -->
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
          <div class="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center text-4xl">Trash</div>
          <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">{{ $t('links.modal.delete_title') }}</h3>
          <p class="text-gray-600 dark:text-gray-300 mb-8">
            Link <strong class="text-red-600 dark:text-red-400">{{ selectedLink?.title }}</strong> akan dihapus permanen.
          </p>
          <div class="flex gap-4">
            <button @click="closeModals" class="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              {{ $t('common.cancel') }}
            </button>
            <button @click="handleDelete" class="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all">
              {{ $t('common.delete') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>