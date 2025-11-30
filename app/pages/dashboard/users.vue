<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

// 1. Proteksi Halaman (Admin Only)
const userCookie = useCookie<any>('user_data')
if (userCookie.value?.role !== 'admin') {
  await navigateTo('/dashboard')
}

// 2. Inisialisasi Global Loading, Toast, & i18n
const { startLoading, stopLoading } = useGlobalLoading()
const toast = useToast()
const { t } = useI18n() 

// --- INTEGRASI CHAT ---
// Menggunakan global state untuk membuka widget chat
const { openChatWith } = useChatState()

// --- STATE MANAGEMENT ---
const { data: users, pending, refresh, error } = await useFetch('/api/users')

// State Modal & Dropdown
const showCreateModal = ref(false)
const showImportModal = ref(false)
const showViewModal = ref(false)
const showEditModal = ref(false)
const showLockConfirm = ref(false)
const showDeleteConfirm = ref(false)
const showDropdown = ref(false)

// Data Holder
const selectedUser = ref<any>(null)
const importFile = ref<File | null>(null)

const form = ref({
  name: '',
  email: '',
  password: '',
  roleId: 3,
  isActive: true
})

// Animation states
const tableVisible = ref(false)

onMounted(() => {
  setTimeout(() => {
    tableVisible.value = true
  }, 300)
})

// --- ACTIONS ---

// Helper: Reset Form & Tutup Modal
const closeModals = () => {
  showCreateModal.value = false
  showImportModal.value = false
  showViewModal.value = false
  showEditModal.value = false
  showLockConfirm.value = false
  showDeleteConfirm.value = false
  showDropdown.value = false
  
  form.value = { name: '', email: '', password: '', roleId: 3, isActive: true }
  selectedUser.value = null
  importFile.value = null
}

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

// 1. Create User
const handleCreateUser = async () => {
  startLoading(t('users.messages.create_process'))
  try {
    await $fetch('/api/users/create', { method: 'POST', body: form.value })
    await refresh()
    closeModals()
    await stopLoading()
    toast.success(t('users.messages.create_success'))
  } catch (e: any) {
    await stopLoading()
    toast.error(e.data?.message || t('users.messages.create_error'))
  }
}

// 2. Import CSV
const onFileChange = (e: any) => {
  const file = e.target.files[0]
  if (file && file.type === "text/csv") {
    importFile.value = file
  } else {
    toast.warning(t('users.messages.file_format'))
    e.target.value = null
  }
}

const downloadTemplate = () => {
  const csvContent = "Name,Email,Password,Role\nBudi Santoso,budi@sikap.com,rahasia123,editor\nSiti Aminah,siti@sikap.com,password123,viewer"
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = "template_users.csv"
  a.click()
  window.URL.revokeObjectURL(url)
  toast.info('Template CSV diunduh')
}

const handleImport = async () => {
  if (!importFile.value) return toast.warning(t('users.messages.file_required'))
  
  startLoading(t('users.messages.import_process'))
  const formData = new FormData()
  formData.append('file', importFile.value)

  try {
    const res: any = await $fetch('/api/users/import', {
      method: 'POST',
      body: formData
    })
    await refresh()
    closeModals()
    await stopLoading()
    toast.success(res.message)
  } catch (e: any) {
    await stopLoading()
    toast.error(e.data?.message || t('users.messages.import_error'))
  }
}

// 3. View & Edit User
const openViewModal = (user: any) => {
  selectedUser.value = user
  showViewModal.value = true
}

const openEditModal = (user: any) => {
  selectedUser.value = user
  form.value = {
    name: user.name,
    email: user.email,
    password: '',
    roleId: user.roleId || 3,
    isActive: user.isActive ?? true
  }
  showEditModal.value = true
}

const handleUpdateUser = async () => {
  if (!selectedUser.value) return
  startLoading(t('users.messages.update_process'))
  try {
    await $fetch(`/api/users/${selectedUser.value.id}`, {
      method: 'PUT',
      body: form.value
    })
    await refresh()
    closeModals()
    await stopLoading()
    toast.success(t('users.messages.update_success'))
  } catch (e: any) {
    await stopLoading()
    toast.error(e.data?.message || t('users.messages.update_error'))
  }
}

// 4. Lock User
const openLockConfirm = (user: any) => {
  selectedUser.value = user
  showLockConfirm.value = true
}

const toggleUserLock = async () => {
  if (!selectedUser.value) return
  
  const isLocking = selectedUser.value.isActive 
  startLoading(isLocking ? t('users.messages.lock_process') : t('users.messages.unlock_process'))
  
  try {
    const newStatus = !isLocking
    await $fetch(`/api/users/${selectedUser.value.id}`, {
      method: 'PUT',
      body: { isActive: newStatus }
    })
    await refresh()
    closeModals()
    await stopLoading()
    toast.success(t('users.messages.status_success'))
  } catch (e: any) {
    await stopLoading()
    toast.error(t('users.messages.status_error'))
  }
}

// 5. Delete User
const openDeleteConfirm = (user: any) => {
  selectedUser.value = user
  showDeleteConfirm.value = true
}

const handleDeleteUser = async () => {
  if (!selectedUser.value) return
  
  startLoading('Menghapus Pengguna...')
  try {
    await $fetch(`/api/users/${selectedUser.value.id}`, { method: 'DELETE' })
    await refresh()
    closeModals()
    await stopLoading()
    toast.success('Pengguna berhasil dihapus')
  } catch (e: any) {
    await stopLoading()
    toast.error(e.data?.message || 'Gagal menghapus pengguna')
  }
}

const getRoleBadgeClass = (roleName: string) => {
  switch (roleName) {
    case 'admin': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
    case 'editor': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
    default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
  }
}

const getStatusBadgeClass = (isActive: boolean) => {
  return isActive 
    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
    : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
}
</script>

<template>
  <div @click="showDropdown = false" class="min-h-screen p-4 sm:p-6 animate-fade-in">
    
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8 animate-slide-down">
      <div class="space-y-2">
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
          {{ $t('users.title') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          {{ $t('users.subtitle') }}
        </p>
      </div>
      
      <div class="relative w-full sm:w-auto">
        <button 
          @click.stop="toggleDropdown"
          class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95"
        >
          <span class="font-semibold">+ {{ $t('users.add_btn') }}</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform duration-300" :class="showDropdown ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div v-if="showDropdown" class="absolute top-full left-0 right-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-20">
            <button @click="showCreateModal = true" class="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors">
              <span class="text-blue-500">✏️</span>
              <span>{{ $t('users.add_manual') }}</span>
            </button>
            <button @click="showImportModal = true" class="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors">
              <span class="text-green-500">📊</span>
              <span>{{ $t('users.import_csv') }}</span>
            </button>
          </div>
        </transition>
      </div>
    </div>

    <div v-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 text-red-600 dark:text-red-400">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-500">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <h3 class="font-semibold text-sm">Gagal memuat data</h3>
          <p class="text-xs opacity-80 mt-1">Silakan refresh halaman atau coba lagi nanti</p>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-full text-left text-sm">
          <thead class="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold uppercase text-xs border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th class="px-4 py-3 sm:px-6 sm:py-4 font-medium">User</th>
              <th class="px-4 py-3 sm:px-6 sm:py-4 font-medium hidden sm:table-cell">Role</th>
              <th class="px-4 py-3 sm:px-6 sm:py-4 font-medium">Status</th>
              <th class="px-4 py-3 sm:px-6 sm:py-4 font-medium text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-if="pending">
              <td colspan="4" class="px-4 py-8 sm:px-6 text-center text-gray-400 dark:text-gray-500">
                <div class="flex justify-center items-center gap-2">
                  <div class="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span class="text-sm">{{ $t('common.loading') }}</span>
                </div>
              </td>
            </tr>
            <tr v-else-if="!users?.length">
              <td colspan="4" class="px-4 py-8 sm:px-6 text-center text-gray-400 dark:text-gray-500 italic">
                <div class="flex flex-col items-center gap-2">
                  <div class="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-xl opacity-60">
                    👥
                  </div>
                  <p class="text-sm">Belum ada pengguna</p>
                </div>
              </td>
            </tr>

            <tr 
              v-for="user in users" 
              :key="user.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <td class="px-4 py-3 sm:px-6 sm:py-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-200 dark:bg-gray-600 overflow-hidden flex items-center justify-center border border-gray-300 dark:border-gray-500 text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">
                    <img v-if="user.photoProfile" :src="user.photoProfile" class="w-full h-full object-cover" />
                    <span v-else>{{ user.name.charAt(0).toUpperCase() }}</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="font-medium text-gray-900 dark:text-gray-100 truncate text-sm sm:text-base">{{ user.name }}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ user.email }}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 sm:px-6 sm:py-4 hidden sm:table-cell">
                <span :class="getRoleBadgeClass(user.role?.name)" class="px-2 py-1 rounded-lg text-xs font-medium capitalize">
                  {{ user.role?.name === 'admin' ? 'Super Admin' : user.role?.name }}
                </span>
              </td>
              <td class="px-4 py-3 sm:px-6 sm:py-4">
                <span :class="getStatusBadgeClass(user.isActive ?? true)" class="px-2 py-1 rounded-lg text-xs font-medium capitalize">
                  {{ (user.isActive ?? true) ? $t('users.status.active') : $t('users.status.locked') }}
                </span>
              </td>
              <td class="px-4 py-3 sm:px-6 sm:py-4">
                <div class="flex justify-center items-center gap-1 sm:gap-2">
                  
                  <button 
                    v-if="user.email !== userCookie.email"
                    @click="openChatWith(user)"
                    class="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" 
                    :title="'Chat dengan ' + user.name"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                  <button @click="openViewModal(user)" class="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" :title="$t('common.view')">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button @click="openEditModal(user)" class="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors" :title="$t('common.edit')">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button 
                    v-if="user.email !== userCookie.email"
                    @click="openLockConfirm(user)"
                    class="p-1.5 sm:p-2 rounded-lg transition-colors"
                    :class="(user.isActive ?? true) ? 'text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30' : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'"
                  >
                    <svg v-if="user.isActive ?? true" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button 
                    v-if="user.email !== userCookie.email"
                    @click="openDeleteConfirm(user)"
                    class="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" 
                    :title="$t('common.delete')"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="showCreateModal || showImportModal || showViewModal || showEditModal || showLockConfirm || showDeleteConfirm" class="fixed inset-0 z-40 bg-black/50" @click="closeModals"></div>
    </Transition>

    <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-200" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm pointer-events-auto border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div class="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4 text-2xl">
            🗑️
          </div>
          <h3 class="font-bold text-lg text-gray-800 dark:text-white mb-2">
            {{ $t('users.modal.delete_title') || 'Hapus Pengguna?' }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {{ $t('users.modal.delete_desc') || 'Pengguna ini akan dihapus permanen.' }}
          </p>
          <div class="flex gap-3">
            <button @click="closeModals" class="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              {{ $t('common.cancel') }}
            </button>
            <button @click="handleDeleteUser" class="flex-1 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors">
              Ya, Hapus
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-200" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md pointer-events-auto border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h3 class="font-bold text-gray-800 dark:text-white">{{ $t('users.modal.create_title') }}</h3>
            <button @click="closeModals" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
          </div>
          <form @submit.prevent="handleCreateUser" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{{ $t('users.modal.name_label') }}</label>
              <input v-model="form.name" required class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{{ $t('users.modal.email_label') }}</label>
              <input v-model="form.email" type="email" required class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{{ $t('users.modal.password_label') }}</label>
              <input v-model="form.password" type="password" required class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" placeholder="Min. 6 karakter" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{{ $t('users.modal.role_label') }}</label>
              <select v-model="form.roleId" class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg outline-none transition-colors">
                <option :value="1">Admin</option>
                <option :value="2">Editor</option>
                <option :value="3">Viewer</option>
              </select>
            </div>
            <div class="pt-2 flex gap-3">
              <button type="button" @click="closeModals" class="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {{ $t('common.cancel') }}
              </button>
              <button type="submit" class="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                {{ $t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-200" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="showImportModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg pointer-events-auto border border-gray-200 dark:border-gray-700 p-6 max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-lg text-gray-800 dark:text-white">{{ $t('users.modal.import_title') }}</h3>
            <button @click="closeModals" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
          </div>
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 text-sm text-blue-700 dark:text-blue-300">
            <p class="font-semibold mb-1">Panduan Import:</p>
            <ul class="list-disc pl-5 space-y-1 opacity-90">
              <li>Format: <strong>Name, Email, Password, Role</strong></li>
              <li>Role: admin, editor, viewer.</li>
            </ul>
          </div>
          <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative">
            <input type="file" accept=".csv" @change="onFileChange" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div v-if="!importFile">
              <div class="text-4xl mb-2 grayscale opacity-70">📄</div>
              <p class="text-gray-600 dark:text-gray-300 font-medium">{{ $t('users.modal.file_label') }}</p>
            </div>
            <div v-else>
              <p class="text-gray-800 dark:text-white font-medium">{{ importFile.name }}</p>
            </div>
          </div>
          <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button @click="downloadTemplate" class="text-blue-600 dark:text-blue-400 text-sm hover:underline flex items-center gap-1">
              ⬇ Template CSV
            </button>
            <button @click="handleImport" :disabled="!importFile" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors w-full sm:w-auto">
              {{ $t('users.import_csv') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-200" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md pointer-events-auto border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[90vh] overflow-y-auto">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h3 class="font-bold text-gray-800 dark:text-white">{{ $t('users.modal.edit_title') }}</h3>
            <button @click="closeModals" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
          </div>
          <form @submit.prevent="handleUpdateUser" class="p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{{ $t('users.modal.name_label') }}</label>
              <input v-model="form.name" required class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{{ $t('users.modal.email_label') }}</label>
              <input v-model="form.email" type="email" required class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{{ $t('users.modal.password_new_label') }}</label>
              <input v-model="form.password" type="password" class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{{ $t('users.modal.role_label') }}</label>
              <select v-model="form.roleId" class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg outline-none transition-colors">
                <option :value="1">Admin</option>
                <option :value="2">Editor</option>
                <option :value="3">Viewer</option>
              </select>
            </div>
            <div class="pt-2 flex gap-3">
              <button type="button" @click="closeModals" class="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {{ $t('common.cancel') }}
              </button>
              <button type="submit" class="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                {{ $t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-200" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="showViewModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm pointer-events-auto border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 class="font-bold text-gray-800 dark:text-white">{{ $t('users.modal.detail_title') }}</h3>
            <button @click="closeModals" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
          </div>
          <div class="p-6 text-center">
            <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mx-auto mb-4 overflow-hidden border-2 border-white dark:border-gray-600 flex items-center justify-center text-xl font-bold text-gray-400 dark:text-gray-300">
              <img v-if="selectedUser?.photoProfile" :src="selectedUser.photoProfile" class="w-full h-full object-cover" />
              <span v-else>{{ selectedUser?.name?.charAt(0).toUpperCase() }}</span>
            </div>
            <h2 class="text-lg font-bold text-gray-800 dark:text-white">{{ selectedUser?.name }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ selectedUser?.email }}</p>
            <div class="flex flex-col sm:flex-row justify-center gap-2 text-xs">
              <span class="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-100 dark:border-blue-800 capitalize">
                {{ selectedUser?.role?.name }}
              </span>
              <span class="px-3 py-1 rounded-full border capitalize" :class="(selectedUser?.isActive ?? true) ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-100 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800'">
                {{ (selectedUser?.isActive ?? true) ? $t('users.status.active') : $t('users.status.locked') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-200" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
      <div v-if="showLockConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm pointer-events-auto border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div class="w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center mx-auto mb-4 text-2xl">
            {{ (selectedUser?.isActive ?? true) ? '🔒' : '🔓' }}
          </div>
          <h3 class="font-bold text-lg text-gray-800 dark:text-white mb-2">
            {{ (selectedUser?.isActive ?? true) ? $t('users.modal.lock_title') : $t('users.modal.unlock_title') }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {{ $t('users.modal.lock_desc') }}
          </p>
          <div class="flex gap-3">
            <button @click="closeModals" class="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              {{ $t('common.cancel') }}
            </button>
            <button @click="toggleUserLock" class="flex-1 py-2.5 text-white rounded-lg transition-colors" :class="(selectedUser?.isActive ?? true) ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'">
              Ya, Lanjutkan
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.animate-fade-in { 
  animation: fadeIn 0.5s ease-out forwards; 
}

.animate-slide-down { 
  animation: slideDown 0.5s ease-out forwards; 
}

@keyframes fadeIn { 
  from { opacity: 0; } 
  to { opacity: 1; } 
}

@keyframes slideDown { 
  from { 
    opacity: 0; 
    transform: translateY(-10px); 
  } 
  to { 
    opacity: 1; 
    transform: translateY(0); 
  } 
}

/* Responsive table adjustments */
@media (max-width: 640px) {
  .table-responsive {
    font-size: 0.875rem;
  }
  
  .action-buttons {
    flex-wrap: nowrap;
  }
}
</style>