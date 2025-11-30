<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useCookie } from '#app'

// Global State (dari composable useChatState)
const { isOpen, targetUser } = useChatState()

const userCookie = useCookie<any>('user_data')
const currentUser = computed(() => userCookie.value || {})
const isAdmin = computed(() => currentUser.value.role === 'admin')

// --- STATE UI ---
// view: 'list_conversations' (Admin melihat chat masuk)
// view: 'list_admins' (User memilih admin)
// view: 'chat' (Room chat aktif)
const view = ref<'list_conversations' | 'list_admins' | 'chat'>('list_conversations')

const conversations = ref<any[]>([]) // List user yang chat ke admin
const adminList = ref<any[]>([])     // List admin yang tersedia untuk dihubungi
const messages = ref<any[]>([])
const activePartner = ref<any>(null)
const newMessage = ref('')
const chatContainer = ref<HTMLElement | null>(null)
let pollingInterval: NodeJS.Timer | null = null

// --- WATCHER ---
watch(targetUser, (newTarget) => {
  if (newTarget) {
    activePartner.value = newTarget
    view.value = 'chat'
    fetchMessages()
  }
})

// --- LOGIC UTAMA ---

const toggleWidget = async () => {
  isOpen.value = !isOpen.value
  
  if (isOpen.value) {
    // 1. Jika ada target spesifik (misal diklik dari tabel User)
    if (targetUser.value) {
      view.value = 'chat'
      activePartner.value = targetUser.value
      await fetchMessages()
    } 
    // 2. Jika Login sebagai ADMIN -> Tampilkan List Percakapan
    else if (isAdmin.value) {
      view.value = 'list_conversations'
      await fetchConversations()
    } 
    // 3. Jika Login sebagai USER BIASA -> Tampilkan List Admin
    else {
      view.value = 'list_admins'
      await fetchAdmins()
    }
    startPolling()
  } else {
    stopPolling()
  }
}

// --- API CALLS ---

const fetchConversations = async () => {
  try {
    const data: any = await $fetch('/api/chat/conversations')
    conversations.value = data
  } catch (e) { console.error(e) }
}

const fetchAdmins = async () => {
  try {
    const data: any = await $fetch('/api/chat/admins')
    adminList.value = data
  } catch (e) { console.error("Gagal load admin list", e) }
}

const fetchMessages = async () => {
  if (!activePartner.value) return
  try {
    const data: any = await $fetch('/api/chat/messages', {
      params: { partnerId: activePartner.value.partnerId || activePartner.value.id }
    })
    messages.value = data
    // Auto scroll hanya jika kita berada di paling bawah atau pesan baru saja dimuat
    if (chatContainer.value && (chatContainer.value.scrollTop + chatContainer.value.clientHeight >= chatContainer.value.scrollHeight - 100)) {
        scrollToBottom()
    }
  } catch (e) { console.error(e) }
}

const deleteMessage = async (msgId: number) => {
  if (!confirm('Hapus pesan ini?')) return

  try {
    await $fetch(`/api/chat/${msgId}`, { method: 'DELETE' })
    // Refresh pesan langsung agar UI update
    await fetchMessages()
  } catch (e) {
    console.error(e)
    alert('Gagal menghapus pesan')
  }
}

// --- ACTIONS ---

const selectPartner = (partner: any) => {
  // Normalisasi data partner agar konsisten (baik dari list conversation maupun list admin)
  activePartner.value = {
    partnerId: partner.id || partner.partnerId,
    name: partner.name,
    photo: partner.photo || partner.photoProfile,
    role: partner.role || 'Admin'
  }
  view.value = 'chat'
  fetchMessages()
  scrollToBottom()
}

const backToList = () => {
  activePartner.value = null
  targetUser.value = null
  
  if (isAdmin.value) {
    view.value = 'list_conversations'
    fetchConversations()
  } else {
    view.value = 'list_admins'
    fetchAdmins()
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || !activePartner.value) return
  
  const content = newMessage.value
  newMessage.value = ''

  try {
    await $fetch('/api/chat/send', {
      method: 'POST',
      body: {
        receiverId: activePartner.value.partnerId,
        content: content
      }
    })
    await fetchMessages()
    scrollToBottom()
  } catch (e) {
    console.error(e)
    alert('Gagal mengirim pesan')
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// --- POLLING ---
const startPolling = () => {
  stopPolling()
  pollingInterval = setInterval(() => {
    if (isOpen.value) {
      if (view.value === 'chat') fetchMessages()
      if (view.value === 'list_conversations') fetchConversations()
      // List admins jarang berubah, tidak perlu dipoll sering-sering
    }
  }, 3000)
}

const stopPolling = () => {
  if (pollingInterval) clearInterval(pollingInterval)
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

onUnmounted(() => stopPolling())
</script>

<template>
  <div class="fixed bottom-6 right-6 z-40 flex flex-col items-end print:hidden">
    
    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="transform opacity-0 translate-y-4 scale-95"
      enter-to-class="transform opacity-100 translate-y-0 scale-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="transform opacity-100 translate-y-0 scale-100"
      leave-to-class="transform opacity-0 translate-y-4 scale-95"
    >
      <div 
        v-if="isOpen" 
        class="mb-4 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[500px]"
      >
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white shrink-0">
          <div class="flex items-center gap-3">
            <button v-if="view === 'chat'" @click="backToList" class="hover:bg-white/20 p-1 rounded-full transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            
            <div v-if="view === 'list_conversations'" class="font-bold">Pesan Masuk</div>
            <div v-else-if="view === 'list_admins'" class="font-bold">Hubungi Admin</div>
            
            <div v-else class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/30">
                <img v-if="activePartner?.photo" :src="activePartner.photo" class="w-full h-full object-cover">
                <span v-else>{{ activePartner?.name?.charAt(0) }}</span>
              </div>
              <div>
                <div class="font-bold text-sm max-w-[150px] truncate">{{ activePartner?.name }}</div>
                <div class="text-xs opacity-80">{{ activePartner?.role || 'User' }}</div>
              </div>
            </div>
          </div>
          
          <button @click="toggleWidget" class="hover:bg-white/20 p-1 rounded-full transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div v-if="view === 'list_admins'" class="flex-1 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900">
           <div class="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pilih Admin</div>
           <div 
            v-for="admin in adminList" 
            :key="admin.id"
            @click="selectPartner(admin)"
            class="p-3 bg-white dark:bg-gray-800 rounded-xl mb-2 cursor-pointer hover:shadow-md transition-all border border-gray-100 dark:border-gray-700 flex items-center gap-3"
          >
            <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center overflow-hidden shrink-0">
               <img v-if="admin.photo" :src="admin.photo" class="w-full h-full object-cover">
               <span v-else class="font-bold">{{ admin.name.charAt(0) }}</span>
            </div>
            <div>
              <div class="font-bold text-sm text-gray-800 dark:text-gray-200">{{ admin.name }}</div>
              <div class="text-xs text-blue-600 dark:text-blue-400">Super Admin</div>
            </div>
          </div>
        </div>

        <div v-else-if="view === 'list_conversations'" class="flex-1 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900">
          <div v-if="conversations.length === 0" class="text-center text-gray-500 mt-10 text-sm flex flex-col items-center">
            <span class="text-4xl mb-2">📭</span>
            Belum ada pesan masuk
          </div>
          <div 
            v-for="conv in conversations" 
            :key="conv.partnerId"
            @click="selectPartner(conv)"
            class="p-3 bg-white dark:bg-gray-800 rounded-xl mb-2 cursor-pointer hover:shadow-md transition-all border border-gray-100 dark:border-gray-700 relative"
          >
            <div class="flex items-start gap-3">
              <div class="relative">
                <img v-if="conv.photo" :src="conv.photo" class="w-10 h-10 rounded-full object-cover">
                <div v-else class="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">{{ conv.name.charAt(0) }}</div>
                <div v-if="conv.unreadCount > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-white">{{ conv.unreadCount }}</div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-baseline">
                  <h4 class="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{{ conv.name }}</h4>
                  <span class="text-[10px] text-gray-400">{{ formatTime(conv.timestamp) }}</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" :class="{'font-bold text-gray-800 dark:text-gray-200': conv.unreadCount > 0}">{{ conv.lastMessage }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
          <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
            <div v-if="messages.length === 0" class="text-center text-xs text-gray-400 my-4">Mulai percakapan...</div>
            
            <div 
              v-for="msg in messages" 
              :key="msg.id" 
              class="flex flex-col max-w-[85%] group relative"
              :class="msg.senderId === currentUser.id ? 'self-end items-end' : 'self-start items-start'"
            >
              <div 
                class="px-4 py-2 rounded-2xl text-sm shadow-sm break-words relative"
                :class="msg.senderId === currentUser.id 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-600'"
              >
                {{ msg.content }}
              </div>
              
              <div class="flex items-center gap-2 mt-1 px-1">
                <span class="text-[10px] text-gray-400">{{ formatTime(msg.createdAt) }}</span>
                
                <button 
                  v-if="msg.senderId === currentUser.id"
                  @click="deleteMessage(msg.id)"
                  class="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                  title="Hapus pesan"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>

            </div>
          </div>

          <div class="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <form @submit.prevent="sendMessage" class="flex gap-2">
              <input 
                v-model="newMessage" 
                type="text" 
                placeholder="Tulis pesan..." 
                class="flex-1 bg-gray-100 dark:bg-gray-700 border-0 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-100"
              >
              <button 
                type="submit" 
                :disabled="!newMessage.trim()"
                class="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <svg class="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
              </button>
            </form>
          </div>
        </div>

      </div>
    </transition>

    <button 
      @click="toggleWidget"
      class="group relative flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800"
      :class="isOpen ? 'bg-red-500 rotate-90' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1'"
    >
      <span v-if="!isOpen" class="absolute -top-1 -right-1 flex h-4 w-4">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 border-2 border-white dark:border-gray-800"></span>
      </span>
      
      <svg v-if="!isOpen" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
      <svg v-else class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>

      <span v-if="!isOpen" class="absolute right-full mr-3 bg-gray-900 text-white text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {{ isAdmin ? 'Cek Pesan' : 'Hubungi Admin' }}
      </span>
    </button>
  </div>
</template>