<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isOpen = ref(false)
const notifications = ref<any[]>([])
const unreadCount = ref(0)
const dropdownRef = ref<HTMLElement | null>(null) // Ref untuk elemen container
let pollingInterval: NodeJS.Timer | null = null

// Fetch data notifikasi menggunakan $fetch (lebih aman untuk polling daripada useFetch)
const fetchNotifications = async () => {
  try {
    const data: any = await $fetch('/api/notifications')
    if (data) {
      notifications.value = data.notifications
      unreadCount.value = data.unreadCount
    }
  } catch (e) {
    console.error('Gagal mengambil notifikasi', e)
  }
}

// Mark as read
const markAsRead = async () => {
  if (unreadCount.value > 0) {
    try {
      await $fetch('/api/notifications/read', { method: 'PUT' })
      unreadCount.value = 0
      // Update status lokal agar UI langsung berubah
      notifications.value.forEach(n => n.isRead = true)
    } catch (e) {
      console.error(e)
    }
  }
}

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    markAsRead()
  }
}

const closeDropdown = () => {
  isOpen.value = false
}

// Logika Manual Click Outside
const handleClickOutside = (event: MouseEvent) => {
  // Jika dropdown terbuka DAN klik terjadi DI LUAR elemen dropdownRef
  if (isOpen.value && dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

// Format waktu (misal: "2 menit yang lalu")
const timeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'Baru saja'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  return date.toLocaleDateString('id-ID')
}

// Lifecycle Hooks
onMounted(() => {
  fetchNotifications()
  // Refresh setiap 10 detik
  pollingInterval = setInterval(fetchNotifications, 10000)
  
  // Daftarkan event listener ke dokumen
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  if (pollingInterval) clearInterval(pollingInterval)
  
  // Bersihkan event listener saat komponen dihancurkan agar tidak membebani memori
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="relative" ref="dropdownRef">
    
    <button 
      @click.stop="toggleDropdown"
      class="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50 transition-all relative outline-none focus:outline-none"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
      </svg>
      
      <span 
        v-if="unreadCount > 0" 
        class="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-800"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div 
        v-if="isOpen"
        class="absolute right-0 mt-2 w-80 origin-top-right rounded-xl bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden border border-gray-100 dark:border-gray-700"
      >
        <div class="px-4 py-3 bg-gray-50/50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100">Notifikasi</h3>
          <button @click="markAsRead" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Tandai dibaca</button>
        </div>

        <div class="max-h-96 overflow-y-auto custom-scrollbar">
          <div v-if="notifications.length === 0" class="px-4 py-6 text-center text-sm text-gray-500">
            Tidak ada notifikasi baru
          </div>
          
          <ul v-else class="divide-y divide-gray-100 dark:divide-gray-700">
            <li v-for="notif in notifications" :key="notif.id">
              <NuxtLink 
                :to="notif.link || '#'" 
                @click="isOpen = false"
                class="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                :class="{'bg-blue-50/30 dark:bg-blue-900/10': !notif.isRead}"
              >
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0 mt-1">
                     <div class="w-2 h-2 rounded-full transition-colors" :class="notif.isRead ? 'bg-transparent' : 'bg-blue-500'"></div>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{ notif.title }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{{ notif.message }}</p>
                    <p class="text-[10px] text-gray-400 mt-1">{{ timeAgo(notif.createdAt) }}</p>
                  </div>
                </div>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* Optional: Scrollbar styling untuk list notifikasi */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
}
</style>