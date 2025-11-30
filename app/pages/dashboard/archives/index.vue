<script setup lang="ts">
import { ref, computed } from 'vue'
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { startLoading, stopLoading } = useGlobalLoading()
const toast = useToast()
const { t } = useI18n()

// State
const user = useCookie<any>('user_data')
const { data: folders, pending, refresh, error } = await useFetch('/api/folders')
const searchQuery = ref('')

// Modal States
const showCreateModal = ref(false)
const showRenameModal = ref(false)
const showDeleteConfirm = ref(false)

// Data Holders
const selectedFolder = ref<any>(null)
const newFolderName = ref('')

// Computed
const filteredFolders = computed(() => {
  if (!folders.value) return []
  return folders.value.filter((f: any) =>
    f.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    f.user?.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// Close all modals
const closeModals = () => {
  showCreateModal.value = false
  showRenameModal.value = false
  showDeleteConfirm.value = false
  newFolderName.value = ''
  selectedFolder.value = null
}

// Create Folder
const handleCreate = async () => {
  if (!newFolderName.value.trim()) return toast.warning('Nama folder wajib diisi')
  startLoading('Membuat folder...')
  try {
    await $fetch('/api/folders/create', {
      method: 'POST',
      body: { name: newFolderName.value, userId: user.value?.id }
    })
    await refresh()
    closeModals()
    await stopLoading()
    toast.success('Folder berhasil dibuat')
  } catch (e: any) {
    await stopLoading()
    toast.error(e.data?.message || 'Gagal membuat folder')
  }
}

// Rename Folder
const openRename = (folder: any) => {
  selectedFolder.value = folder
  newFolderName.value = folder.name
  showRenameModal.value = true
}
const handleRename = async () => {
  if (!selectedFolder.value || !newFolderName.value.trim()) return
  startLoading('Menyimpan...')
  try {
    await $fetch(`/api/folders/${selectedFolder.value.id}`, {
      method: 'PUT',
      body: { name: newFolderName.value }
    })
    await refresh()
    closeModals()
    await stopLoading()
    toast.success('Nama folder diperbarui')
  } catch (e: any) {
    await stopLoading()
    toast.error(e.data?.message || 'Gagal mengubah nama')
  }
}

// Delete Folder
const openDelete = (folder: any) => {
  selectedFolder.value = folder
  showDeleteConfirm.value = true
}
const handleDelete = async () => {
  if (!selectedFolder.value) return
  startLoading('Menghapus...')
  try {
    await $fetch(`/api/folders/${selectedFolder.value.id}`, { method: 'DELETE' })
    await refresh()
    closeModals()
    await stopLoading()
    toast.success('Folder berhasil dihapus')
  } catch (e: any) {
    await stopLoading()
    toast.error(e.data?.message || 'Gagal menghapus folder')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950/30 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">

      <!-- Header - Ukuran Normal & Elegan -->
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-5">
        <div class="space-y-1">
          <h1 class="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            Arsip Digital
          </h1>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ $t('archives.subtitle') }}
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <!-- Search - Ukuran Normal -->
          <div class="relative group">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="$t('archives.search_placeholder')"
              class="w-full sm:w-80 pl-10 pr-4 py-2.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-md transition-all duration-300 text-sm"
            />
          </div>

          <!-- Tombol Tambah - Ukuran Normal -->
          <button @click="showCreateModal = true"
            class="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            {{ $t('archives.add_folder') }}
            <div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mb-6 p-4 bg-red-500/10 border border-red-500/30 backdrop-blur-md rounded-xl text-red-600 dark:text-red-400 text-center text-sm font-medium">
        Gagal memuat data folder.
      </div>

      <!-- Table Card - Ukuran Normal & Responsif -->
      <div class="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/20 dark:border-gray-800/50 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-gradient-to-r from-indigo-600/10 to-purple-600/10 dark:from-indigo-500/5 dark:to-purple-500/5">
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Nama Folder</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Pembuat</th>
                <th class="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Total File</th>
                <th class="px-6 py-4 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200/50 dark:divide-gray-800">

              <!-- Loading -->
              <tr v-if="pending">
                <td colspan="4" class="px-6 py-20 text-center">
                  <div class="flex justify-center">
                    <div class="animate-spin rounded-full h-10 w-10 border-t-3 border-b-3 border-indigo-600"></div>
                  </div>
                  <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">Memuat folder...</p>
                </td>
              </tr>

              <!-- Empty -->
              <tr v-else-if="filteredFolders.length === 0">
                <td colspan="4" class="px-6 py-20 text-center text-gray-400 dark:text-gray-500">
                  <div class="w-16 h-16 mx-auto mb-4 opacity-30">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7h18M3 12h18M3 17h18"/>
                    </svg>
                  </div>
                  <p class="text-sm font-medium">{{ $t('archives.empty_title') }}</p>
                </td>
              </tr>

              <!-- Folder Rows -->
              <tr v-for="folder in filteredFolders" :key="folder.id"
                class="hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 group">

                <!-- Nama Folder + Icon -->
                <td class="px-6 py-5">
                  <NuxtLink :to="`/dashboard/archives/${folder.id}`"
                    class="flex items-center gap-3 group-hover:translate-x-1 transition-transform duration-200">
                    <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg flex items-center justify-center">
                      <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z"/>
                      </svg>
                    </div>
                    <div>
                      <p class="font-semibold text-gray-900 dark:text-white text-base">{{ folder.name }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">Klik untuk masuk</p>
                    </div>
                  </NuxtLink>
                </td>

                <!-- Pembuat -->
                <td class="px-6 py-5">
                  <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center shadow-md">
                      {{ folder.user?.name?.charAt(0).toUpperCase() || 'U' }}
                    </div>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {{ folder.user?.name || 'Unknown' }}
                    </span>
                  </div>
                </td>

                <!-- Total File -->
                <td class="px-6 py-5">
                  <span class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 text-emerald-800 dark:text-emerald-300">
                    {{ folder._count?.archives || 0 }} file
                  </span>
                </td>

                <!-- Aksi -->
                <td class="px-6 py-5 text-center">
                  <div class="flex justify-center gap-2">
                    <button @click.stop="openRename(folder)"
                      class="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg transition-all hover:scale-110">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button @click.stop="openDelete(folder)"
                      class="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-all hover:scale-110">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2.5 2.5 0 0116.138 21H7.862a2.5 2.5 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16"/>
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
    <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="showCreateModal || showRenameModal || showDeleteConfirm" class="fixed inset-0 bg-black/60 backdrop-blur-md z-40" @click="closeModals"></div>
    </Transition>

    <!-- Modal Create -->
    <Transition enter-active-class="transition duration-400 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-300 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 w-full max-w-md p-6">
          <h3 class="text-xl font-bold mb-5 text-gray-900 dark:text-white">Buat Folder Baru</h3>
          <input v-model="newFolderName" type="text" placeholder="Nama folder..." class="w-full px-4 py-3 bg-gray-50/70 dark:bg-gray-800/70 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm" autoFocus />
          <div class="flex gap-3 mt-6">
            <button @click="closeModals" class="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm font-medium">Batal</button>
            <button @click="handleCreate" class="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition text-sm font-medium">Buat Folder</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modal Rename -->
    <Transition enter-active-class="transition duration-400 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-300 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="showRenameModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 w-full max-w-md p-6">
          <h3 class="text-xl font-bold mb-5 text-gray-900 dark:text-white">Ganti Nama Folder</h3>
          <input v-model="newFolderName" type="text" class="w-full px-4 py-3 bg-gray-50/70 dark:bg-gray-800/70 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500/50 transition-all text-sm" autoFocus />
          <div class="flex gap-3 mt-6">
            <button @click="closeModals" class="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm font-medium">Batal</button>
            <button @click="handleRename" class="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg shadow-md hover:shadow-lg transition text-sm font-medium">Simpan</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modal Delete -->
    <Transition enter-active-class="transition duration-400 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-300 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 max-w-sm w-full p-6 text-center">
          <div class="w-14 h-14 mx-auto mb-4 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center text-3xl">Trash</div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Hapus Folder?</h3>
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">
            Folder <strong class="text-red-600 dark:text-red-400">{{ selectedFolder?.name }}</strong> akan dihapus permanen.
          </p>
          <div class="flex gap-3">
            <button @click="closeModals" class="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm">Batal</button>
            <button @click="handleDelete" class="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg shadow-md hover:shadow-lg transition text-sm font-medium">Hapus</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>