
<script setup lang="ts">
import { ref, computed } from 'vue'

const route = useRoute()
const router = useRouter()
const folderId = route.params.id as string
const userCookie = useCookie<any>('user_data')

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { startLoading, stopLoading } = useGlobalLoading()
const toast = useToast()
const { t } = useI18n()

// --- STATE ---
const folder = ref<any>(null)
const loading = ref(false)
const allUsers = ref<any[]>([]) 

// Modal States
const showUploadModal = ref(false)
const showRenameModal = ref(false)
const showDeleteFolderConfirm = ref(false)
const showDeleteFileConfirm = ref(false)
const showShareFileModal = ref(false)
const showShareFolderModal = ref(false) // <--- NEW: State Modal Share Folder

// Forms & Data Holders
const newFolderName = ref('')
const selectedFile = ref<any>(null)
const shareFileUserIds = ref<number[]>([]) // ID user yang dishare file
const shareFolderUserIds = ref<number[]>([]) // <--- NEW: ID user yang dishare folder

const uploadForm = ref({
  file: null as File | null,
  title: ''
})

// --- DATA FETCHING ---
const refreshData = async () => {
  try {
    // Diasumsikan endpoint ini juga memuat folder.shares dan archives.fileShares
    const folderData = await $fetch(`/api/folders/${folderId}`)
    folder.value = folderData
  } catch (e) {
    // Gunakan e.data?.message jika tersedia, jika tidak gunakan fallback
    toast.error(t('archives.messages.folder_not_found') || 'Folder tidak ditemukan')
    router.push('/dashboard/archives')
  }
}
await refreshData()

// --- COMPUTED PERMISSIONS ---
const canManage = computed(() => {
  if (!folder.value || !userCookie.value) return false
  return userCookie.value.role === 'admin' || folder.value.userId === userCookie.value.id
})

// --- HELPER ---
const closeModals = () => {
  showUploadModal.value = false; showRenameModal.value = false; showDeleteFolderConfirm.value = false
  showDeleteFileConfirm.value = false; showShareFileModal.value = false
  showShareFolderModal.value = false // <--- UPDATED: Tutup modal share folder
  
  newFolderName.value = ''; selectedFile.value = null; shareFileUserIds.value = []
  shareFolderUserIds.value = [] // <--- UPDATED: Reset state share folder
  uploadForm.value = { file: null, title: '' }
}

const getDownloadUrl = (filePath: string) => filePath

// --- ACTIONS: FOLDER ---

const openRename = () => { newFolderName.value = folder.value.name; showRenameModal.value = true }
const handleRename = async () => { /* ... kode rename ... */ }
const handleDeleteFolder = async () => { /* ... kode delete folder ... */ }

// [NEW] Buka Modal Share Folder
const openShareFolderModal = async () => {
  if (!canManage.value) return; 
  
  startLoading(t('common.loading') || 'Memuat daftar pengguna...')

  // 1. Muat daftar semua user (hanya sekali)
  if (allUsers.value.length === 0) {
    const { data } = await useFetch('/api/users')
    // Filter user diri sendiri dari daftar share
    allUsers.value = (data.value || []).filter((u: any) => u.id !== userCookie.value.id) 
  }
  
  // 2. Set isi checkbox dengan user yang sudah dishare folder
  shareFolderUserIds.value = (folder.value.shares || []).map((s: any) => s.userId)

  await stopLoading()
  showShareFolderModal.value = true
}

// [NEW] Eksekusi Share Folder
const handleShareFolder = async () => {
  if (!folder.value) return
  startLoading('Membagikan Folder...')
  
  try {
    await $fetch('/api/folders/share', {
      method: 'POST',
      body: {
        folderId: folder.value.id,
        targetUserIds: shareFolderUserIds.value
      }
    })
    await refreshData() 
    closeModals(); await stopLoading()
    toast.success('Akses folder berhasil dibagikan!')
  } catch (e) {
    await stopLoading()
    toast.error(e.data?.message || 'Gagal membagikan folder.')
  }
}

// --- ACTIONS: FILE (UPLOAD, SHARE, DELETE) ---

const onFileChange = (e: any) => {
  const file = e.target.files[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) { e.target.value = null; return toast.warning(t('profile.messages.size_error')) }
    uploadForm.value.file = file
    uploadForm.value.title = file.name.substring(0, file.name.lastIndexOf('.')) || file.name 
  } else { uploadForm.value.file = null; uploadForm.value.title = '' }
}

const handleUpload = async () => {
  if (!uploadForm.value.file) return toast.warning(t('archives.messages.upload_error'))

  startLoading(t('archives.messages.upload_process'))
  const formData = new FormData()
  formData.append('file', uploadForm.value.file)
  formData.append('title', uploadForm.value.title || uploadForm.value.file.name)
  formData.append('folderId', folderId)
  formData.append('uploaderId', userCookie.value?.id)

  try {
    await $fetch('/api/archives/upload', { method: 'POST', body: formData })
    await refreshData()
    closeModals(); await stopLoading(); toast.success(t('archives.messages.upload_success'))
  } catch (e) {
    await stopLoading(); toast.error(t('archives.messages.upload_error'))
  }
}

const confirmDeleteFile = (file: any) => { selectedFile.value = file; showDeleteFileConfirm.value = true }
const handleDeleteFile = async () => {
  if (!selectedFile.value) return
  startLoading(t('archives.messages.delete_file_process'))
  try {
    await $fetch(`/api/archives/${selectedFile.value.id}`, { method: 'DELETE' })
    await refreshData()
    closeModals(); await stopLoading(); toast.success(t('archives.messages.delete_file_success'))
  } catch (e) { await stopLoading(); toast.error(t('archives.messages.delete_file_error')) }
}

// [FIX] Buka Modal Share File
const openShareFileModal = async (file: any) => {
  if (!canManage.value) return; 
  
  startLoading(t('common.loading') || 'Memuat daftar pengguna...')

  // 1. Muat daftar semua user (hanya sekali)
  if (allUsers.value.length === 0) {
    const { data } = await useFetch('/api/users')
    allUsers.value = (data.value || []).filter((u: any) => u.id !== userCookie.value.id)
  }
  
  // 2. Set file dan isi checkbox dengan user yang sudah dishare
  selectedFile.value = file
  shareFileUserIds.value = (file.fileShares || []).map((s: any) => s.userId)

  await stopLoading()
  showShareFileModal.value = true
}

// [FIX] Eksekusi Share File
const handleShareFile = async () => {
  if (!selectedFile.value) return
  startLoading('Membagikan File...')
  
  try {
    await $fetch('/api/archives/share', {
      method: 'POST',
      body: {
        archiveId: selectedFile.value.id,
        targetUserIds: shareFileUserIds.value
      }
    })
    await refreshData() 
    closeModals(); await stopLoading()
    toast.success('Akses file berhasil dibagikan!')
  } catch (e) {
    await stopLoading()
    toast.error(e.data?.message || 'Gagal membagikan file.')
  }
}
</script>

<template>
  <div v-if="folder" class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950/30 py-6 px-4 sm:px-6 lg:px-8 flex flex-col">
    
    <div class="max-w-7xl mx-auto mb-6">
      <NuxtLink to="/dashboard/archives" class="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 mb-4 sm:mb-6 transition-all duration-300 hover:translate-x-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        {{ $t('common.back') }}
      </NuxtLink>
      
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
        <div class="flex items-center gap-3 sm:gap-4">
          <div class="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl sm:rounded-2xl shadow-lg flex items-center justify-center transform transition-all duration-300 hover:scale-105">
            <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z"/>
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2 sm:gap-3">
              <h1 class="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                {{ folder.name }}
              </h1>
              <span v-if="!canManage" class="px-2 py-0.5 sm:px-3 sm:py-1 bg-indigo-100/80 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold backdrop-blur-sm">Shared</span>
            </div>
            <div class="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
              <span class="flex items-center gap-1 bg-white/50 dark:bg-gray-800/50 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg backdrop-blur-sm shadow-sm">
                <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {{ folder.user?.name || 'Unknown' }}
              </span>
              <span class="flex items-center gap-1 bg-white/50 dark:bg-gray-800/50 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg backdrop-blur-sm shadow-sm">
                <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {{ folder._count?.archives || 0 }} {{ $t('archives.items') }}
              </span>
              <span class="flex items-center gap-1 bg-white/50 dark:bg-gray-800/50 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg backdrop-blur-sm shadow-sm">
                <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ new Date(folder.createdAt).toLocaleDateString('id-ID') }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="canManage" class="flex items-center gap-2 sm:gap-3 w-full lg:w-auto mt-4 lg:mt-0">
          <button 
            @click="showUploadModal = true"
            class="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-1 lg:flex-none justify-center">
            <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {{ $t('common.upload') }}
            <div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>

          <div class="flex bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/20 dark:border-gray-800/50 rounded-xl shadow-lg overflow-hidden flex-1 lg:flex-none">
            <button @click="openShareFolderModal" class="px-3 py-2 sm:px-4 sm:py-3 text-gray-700 dark:text-gray-300 hover:bg-indigo-500/10 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 hover:scale-110" title="Bagikan Folder">
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
              </svg>
            </button>
            
            <button @click="openRename" class="px-3 py-2 sm:px-4 sm:py-3 text-gray-700 dark:text-gray-300 hover:bg-amber-500/10 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 transition-all duration-300 hover:scale-110 border-l border-white/20 dark:border-gray-800/50" :title="$t('archives.modal.rename_title')">
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button @click="showDeleteFolderConfirm = true" class="px-3 py-2 sm:px-4 sm:py-3 text-gray-700 dark:text-gray-300 hover:bg-red-500/10 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 hover:scale-110 border-l border-white/20 dark:border-gray-800/50" :title="$t('archives.modal.delete_title')">
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2.5 2.5 0 0116.138 21H7.862a2.5 2.5 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/20 dark:border-gray-800/50 overflow-hidden flex-1">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200/50 dark:divide-gray-800">
          <thead>
            <tr class="bg-gradient-to-r from-indigo-600/10 to-purple-600/10 dark:from-indigo-500/5 dark:to-purple-500/5 text-gray-700 dark:text-gray-300 uppercase text-xs font-bold">
              <th class="px-4 py-3 sm:px-6 sm:py-4 text-left">{{ $t('archives.table.name') }}</th>
              <th class="px-4 py-3 sm:px-6 sm:py-4 text-left">{{ $t('archives.table.uploader') }}</th>
              <th class="px-4 py-3 sm:px-6 sm:py-4 text-left">{{ $t('archives.table.size') }}</th>
              <th class="px-4 py-3 sm:px-6 sm:py-4 text-right">{{ $t('archives.table.action') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200/50 dark:divide-gray-800">
            <tr v-if="folder.archives.length === 0">
              <td colspan="4" class="px-4 py-12 sm:px-6 sm:py-20 text-center text-gray-500 dark:text-gray-400">
                <div class="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 opacity-50 animate-pulse">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7h18M3 12h18M3 17h18"/>
                  </svg>
                </div>
                <p class="text-sm sm:text-base font-medium">{{ $t('archives.table.empty_folder') }}</p>
              </td>
            </tr>
            
            <tr v-for="file in folder.archives" :key="file.id" class="hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-300 group">
              <td class="px-4 py-4 sm:px-6 sm:py-5">
                <div class="flex items-center gap-2 sm:gap-3 group-hover:translate-x-1 transition-transform duration-200">
                  <div class="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg shadow-md flex items-center justify-center text-white">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p class="font-semibold text-gray-900 dark:text-white text-sm sm:text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{{ file.title }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ file.fileType }}</p>
                  </div>
                </div>
              </td>
              
              <td class="px-4 py-4 sm:px-6 sm:py-5">
                <div class="flex items-center gap-2 sm:gap-3">
                  <div class="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center shadow-md">
                    {{ file.uploader?.name?.charAt(0).toUpperCase() || 'U' }}
                  </div>
                  <div>
                    <p class="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{{ file.uploader?.name }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ new Date(file.createdAt).toLocaleDateString('id-ID') }}</p>
                  </div>
                </div>
              </td>

              <td class="px-4 py-4 sm:px-6 sm:py-5">
                <span class="inline-flex px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-800 dark:text-gray-300 shadow-sm">
                  {{ (file.fileSize / 1024).toFixed(0) }} KB
                </span>
              </td>
              
              <td class="px-4 py-4 sm:px-6 sm:py-5 text-right">
                <div class="flex justify-end gap-2 sm:gap-3 flex-wrap">
                  <a :href="getDownloadUrl(file.filePath)" target="_blank" download class="group relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    {{ $t('common.download') }}
                    <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  </a>
                  
                  <button 
                    v-if="canManage"
                    @click="openShareFileModal(file)"
                    class="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    title="Bagikan File"
                  >
                    Share
                    <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
                    </svg>
                    <div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  </button>

                  <button 
                    v-if="canManage"
                    @click="confirmDeleteFile(file)"
                    class="group relative overflow-hidden bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                    :title="$t('common.delete')"
                  >
                    {{ $t('common.delete') }}
                    <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2.5 2.5 0 0116.138 21H7.862a2.5 2.5 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <div class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Backdrop -->
    <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="showUploadModal || showRenameModal || showDeleteFolderConfirm || showDeleteFileConfirm || showShareFileModal || showShareFolderModal" class="fixed inset-0 bg-black/60 backdrop-blur-md z-40" @click="closeModals"></div>
    </Transition>

    <!-- Modal Upload -->
    <Transition enter-active-class="transition duration-400 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-300 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="showUploadModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 w-full max-w-sm sm:max-w-md p-5 sm:p-6">
          <div class="flex justify-between items-center mb-4 sm:mb-5">
            <h3 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Upload File</h3>
            <button @click="showUploadModal = false" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200 hover:scale-110">✕</button>
          </div>
          <form @submit.prevent="handleUpload" class="space-y-3 sm:space-y-4">
            <div>
              <label class="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-700 dark:text-gray-300">{{ $t('archives.modal.file_label') }}</label>
              <div class="border-2 border-dashed border-gray-300/60 dark:border-gray-600/60 rounded-xl p-4 sm:p-6 text-center hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all duration-300 relative backdrop-blur-sm">
                <input type="file" @change="onFileChange" required class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                <div v-if="!uploadForm.file" class="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Drag & drop atau klik untuk pilih file (max 5MB)</div>
                <div v-else class="flex flex-col items-center">
                  <svg class="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mb-1 sm:mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5h6a2 2 0 012 2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V7a2 2 0 012-2z" />
                  </svg>
                  <span class="text-green-600 dark:text-green-400 text-xs sm:text-sm font-medium">{{ uploadForm.file.name }}</span>
                  <p class="text-xs text-gray-400 mt-0.5 sm:mt-1">{{ (uploadForm.file.size / 1024).toFixed(1) }} KB</p>
                </div>
              </div>
            </div>
            <div>
              <label class="block text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-700 dark:text-gray-300">{{ $t('archives.modal.title_label') }}</label>
              <input v-model="uploadForm.title" type="text" class="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-50/70 dark:bg-gray-800/70 border border-gray-300/60 dark:border-gray-600/60 rounded-lg focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300 text-xs sm:text-sm" :placeholder="$t('archives.modal.title_placeholder')" />
            </div>
            <div class="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button type="button" @click="closeModals" class="flex-1 py-2 sm:py-2.5 border border-gray-300/60 dark:border-gray-600/60 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-300 text-xs sm:text-sm font-medium">Batal</button>
              <button type="submit" class="flex-1 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-xs sm:text-sm font-medium">Upload</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
    
    <!-- Modal Share File -->
    <Transition enter-active-class="transition duration-400 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-300 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="showShareFileModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 w-full max-w-sm sm:max-w-md p-5 sm:p-6 flex flex-col max-h-[80vh]">
          <div class="flex justify-between items-center mb-4 sm:mb-5">
            <h3 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Bagikan File: {{ selectedFile?.title }}</h3>
            <button @click="showShareFileModal = false" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200 hover:scale-110">✕</button>
          </div>
          <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">Pilih pengguna untuk akses unduh file ini.</p>
          
          <div class="flex-1 overflow-y-auto border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-2 sm:p-3 mb-4 sm:mb-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
            <div v-if="allUsers.length === 0" class="text-center py-4 sm:py-6 text-gray-500 dark:text-gray-400 italic text-xs sm:text-sm">Tidak ada pengguna lain.</div>
            <label v-for="u in allUsers" :key="u.id" class="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-white/80 dark:hover:bg-gray-800/80 rounded-lg cursor-pointer transition-all duration-300 hover:shadow-sm">
              <input type="checkbox" :value="u.id" v-model="shareFileUserIds" class="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 rounded focus:ring-indigo-500/50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 transition-all duration-200">
              <div class="flex items-center gap-1 sm:gap-2">
                <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                  {{ u.name.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <div class="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{{ u.name }}</div>
                  <div class="text-xs text-gray-500 capitalize">{{ u.role || 'user' }}</div>
                </div>
              </div>
            </label>
          </div>

          <div class="flex gap-2 sm:gap-3">
            <button @click="closeModals" class="flex-1 py-2 sm:py-2.5 border border-gray-300/60 dark:border-gray-600/60 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-300 text-xs sm:text-sm font-medium">Batal</button>
            <button @click="handleShareFile" class="flex-1 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-xs sm:text-sm font-medium">Simpan</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modal Share Folder -->
    <Transition enter-active-class="transition duration-400 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-300 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="showShareFolderModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 w-full max-w-sm sm:max-w-md p-5 sm:p-6 flex flex-col max-h-[80vh]">
          <div class="flex justify-between items-center mb-4 sm:mb-5">
            <h3 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Bagikan Folder: {{ folder?.name }}</h3>
            <button @click="showShareFolderModal = false" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200 hover:scale-110">✕</button>
          </div>
          <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">Pilih pengguna untuk akses folder ini.</p>
          
          <div class="flex-1 overflow-y-auto border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-2 sm:p-3 mb-4 sm:mb-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
            <div v-if="allUsers.length === 0" class="text-center py-4 sm:py-6 text-gray-500 dark:text-gray-400 italic text-xs sm:text-sm">Tidak ada pengguna lain.</div>
            <label v-for="u in allUsers" :key="u.id" class="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-white/80 dark:hover:bg-gray-800/80 rounded-lg cursor-pointer transition-all duration-300 hover:shadow-sm">
              <input type="checkbox" :value="u.id" v-model="shareFolderUserIds" class="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 rounded focus:ring-indigo-500/50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 transition-all duration-200">
              <div class="flex items-center gap-1 sm:gap-2">
                <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                  {{ u.name.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <div class="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{{ u.name }}</div>
                  <div class="text-xs text-gray-500 capitalize">{{ u.role || 'user' }}</div>
                </div>
              </div>
            </label>
          </div>

          <div class="flex gap-2 sm:gap-3">
            <button @click="closeModals" class="flex-1 py-2 sm:py-2.5 border border-gray-300/60 dark:border-gray-600/60 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-300 text-xs sm:text-sm font-medium">Batal</button>
            <button @click="handleShareFolder" class="flex-1 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-xs sm:text-sm font-medium">Simpan</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modal Rename -->
    <Transition enter-active-class="transition duration-400 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-300 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="showRenameModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 w-full max-w-sm sm:max-w-md p-5 sm:p-6">
          <h3 class="text-lg sm:text-xl font-bold mb-4 sm:mb-5 text-gray-900 dark:text-white">Ganti Nama Folder</h3>
          <input v-model="newFolderName" type="text" class="w-full px-3 py-2 sm:px-4 sm:py-3 bg-gray-50/70 dark:bg-gray-800/70 border border-gray-300/60 dark:border-gray-600/60 rounded-lg focus:ring-2 focus:ring-amber-500/50 transition-all duration-300 text-xs sm:text-sm" autoFocus />
          <div class="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
            <button @click="closeModals" class="flex-1 py-2 sm:py-2.5 border border-gray-300/60 dark:border-gray-600/60 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-300 text-xs sm:text-sm font-medium">Batal</button>
            <button @click="handleRename" class="flex-1 py-2 sm:py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-xs sm:text-sm font-medium">Simpan</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modal Delete Folder -->
    <Transition enter-active-class="transition duration-400 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-300 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="showDeleteFolderConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 max-w-xs sm:max-w-sm w-full p-5 sm:p-6 text-center">
          <div class="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 bg-red-100/80 dark:bg-red-900/40 rounded-full flex items-center justify-center text-2xl sm:text-3xl text-red-600 dark:text-red-400 animate-bounce">🗑️</div>
          <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Hapus Folder?</h3>
          <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
            Folder <strong class="text-red-600 dark:text-red-400">{{ folder?.name }}</strong> akan dihapus permanen beserta isinya.
          </p>
          <div class="flex gap-2 sm:gap-3">
            <button @click="closeModals" class="flex-1 py-2 sm:py-2.5 border border-gray-300/60 dark:border-gray-600/60 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-300 text-xs sm:text-sm">Batal</button>
            <button @click="handleDeleteFolder" class="flex-1 py-2 sm:py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-xs sm:text-sm font-medium">Hapus</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modal Delete File -->
    <Transition enter-active-class="transition duration-400 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-300 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="showDeleteFileConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 max-w-xs sm:max-w-sm w-full p-5 sm:p-6 text-center">
          <div class="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-4 bg-red-100/80 dark:bg-red-900/40 rounded-full flex items-center justify-center text-2xl sm:text-3xl text-red-600 dark:text-red-400 animate-bounce">📄</div>
          <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">Hapus File?</h3>
          <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
            File <strong class="text-red-600 dark:text-red-400">{{ selectedFile?.title }}</strong> akan dihapus permanen.
          </p>
          <div class="flex gap-2 sm:gap-3">
            <button @click="closeModals" class="flex-1 py-2 sm:py-2.5 border border-gray-300/60 dark:border-gray-600/60 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-300 text-xs sm:text-sm">Batal</button>
            <button @click="handleDeleteFile" class="flex-1 py-2 sm:py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-xs sm:text-sm font-medium">Hapus</button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>