<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useCookie } from '#app'

// Pastikan ChatWidget ter-import (Nuxt biasanya auto-import)
// import ChatWidget from '~/components/ChatWidget.vue' 

const route = useRoute()
const token = useCookie('auth_token')
const userCookie = useCookie<any>('user_data')

const { startLoading, stopLoading } = useGlobalLoading()

// Inisialisasi i18n
const { t } = useI18n() 
const localePath = useLocalePath()

// --- STATE MANAGEMENT ---
const isDesktopSidebarOpen = ref(true)
const isMobileSidebarOpen = ref(false)
const showLogoutConfirm = ref(false)
const showProfileMenu = ref(false)

// Logic Data User
const user = computed(() => {
  const d = userCookie.value
  let displayRole = d?.role || 'viewer'
  if (displayRole === 'admin') displayRole = 'Super Admin' 

  return {
    name: d?.name || 'Pengguna',
    role: displayRole, 
    photo: d?.photoProfile || null,
    initial: d?.name?.charAt(0).toUpperCase() || 'U'
  }
})

// --- KONFIGURASI MENU ---
const menuGroups = computed(() => {
  const groups = [
    {
      title: t('groups.main'), 
      items: [
        { name: t('menu.profile'), path: '/dashboard/profile', icon: 'user' },
        { name: t('menu.dashboard'), path: '/dashboard', icon: 'home' }
      ]
    },
    {
      title: t('groups.management'),
      items: [
        { name: t('menu.users'), path: '/dashboard/users', icon: 'users', adminOnly: true },
        { name: t('menu.categories'), path: '/dashboard/categories', icon: 'tag' },
        { name: t('menu.links'), path: '/dashboard/links', icon: 'link' }
      ]
    },
    {
      title: t('groups.storage'),
      items: [
        { name: t('menu.archives'), path: '/dashboard/archives', icon: 'folder' }
      ]
    }
  ]

  return groups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.adminOnly && userCookie.value?.role !== 'admin') return false
      return true
    })
  })).filter(group => group.items.length > 0)
})

// --- ACTIONS ---
const toggleDesktopSidebar = () => { 
  isDesktopSidebarOpen.value = !isDesktopSidebarOpen.value 
}
const toggleMobileSidebar = () => { 
  isMobileSidebarOpen.value = !isMobileSidebarOpen.value 
}
const toggleProfileMenu = () => { 
  showProfileMenu.value = !showProfileMenu.value 
}
const closeProfileMenu = () => { 
  showProfileMenu.value = false 
}

const onLogoutClick = () => {
  closeProfileMenu()
  showLogoutConfirm.value = true
}

const confirmLogout = async () => {
  showLogoutConfirm.value = false
  startLoading(t('common.loading'))
  token.value = null
  userCookie.value = null
  await stopLoading()
  window.location.href = '/login'
}

// Helper Active Menu
const isActive = (path: string) => {
  const currentPath = route.path
  if (path === '/dashboard') {
     return /\/([a-z]{2}\/)?dashboard$/.test(currentPath)
  }
  return currentPath.includes(path)
}
</script>

<template>
  <div 
    class="flex h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-800 dark:text-gray-100 overflow-hidden transition-all duration-300"
    @click="closeProfileMenu"
  >
    
    <!-- Mobile Overlay -->
    <div 
      v-if="isMobileSidebarOpen"
      @click.stop="isMobileSidebarOpen = false"
      class="fixed inset-0 z-40 bg-black/60 backdrop-blur-md transition-all duration-300 lg:hidden"
    ></div>

    <!-- Sidebar -->
    <aside 
      class="fixed inset-y-0 left-0 z-50 w-80 bg-white/98 dark:bg-gray-900/98 border-r border-gray-200/60 dark:border-gray-800/60 flex flex-col shadow-2xl transition-all duration-400 ease-out lg:relative lg:z-30 lg:flex lg:flex-col lg:inset-y-0 lg:left-0 backdrop-blur-xl"
      :class="[
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        isDesktopSidebarOpen ? 'lg:translate-x-0 lg:w-80 lg:flex' : 'lg:-translate-x-full lg:w-0 lg:hidden'
      ]"
      @click.stop 
    >
      <!-- Header Sidebar -->
      <div class="h-20 flex items-center justify-between px-6 border-b border-gray-100/60 dark:border-gray-800/60 flex-shrink-0">
        <div class="flex items-center gap-3 min-w-0">
          <NuxtLink 
            :to="localePath('/dashboard')" 
            class="flex items-center gap-3 group flex-shrink-0 min-w-0"
            @click="isMobileSidebarOpen = false"
          >
            <img 
              src="/logo.png" 
              alt="Logo SIKAP" 
              class="h-10 w-auto transition-all duration-300 group-hover:scale-105 group-hover:rotate-1 drop-shadow-lg flex-shrink-0" 
            />
            <span 
              class="text-lg font-bold text-gray-800 dark:text-white whitespace-nowrap overflow-hidden transition-all duration-300"
              :class="isDesktopSidebarOpen ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0'"
            >
              
            </span>
          </NuxtLink>
        </div>
        <button 
          @click="isMobileSidebarOpen = false" 
          class="lg:hidden p-2 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50/80 dark:hover:bg-red-900/20 transition-all duration-300 flex-shrink-0"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
        <div v-for="(group, index) in menuGroups" :key="index">
          <h3 
            class="px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4 transition-all duration-300"
            :class="isDesktopSidebarOpen ? 'opacity-100' : 'opacity-0'"
          >
            {{ group.title }}
          </h3>
          <ul class="space-y-2">
            <li v-for="menu in group.items" :key="menu.path">
              <NuxtLink 
                :to="localePath(menu.path)" 
                class="flex items-center px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden border"
                :class="[
                  isActive(menu.path) 
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50/60 text-blue-700 dark:from-blue-950/40 dark:to-indigo-950/30 dark:text-blue-300 font-semibold shadow-sm border-blue-200/50 dark:border-blue-800/40' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50/90 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 border-transparent hover:border-gray-200/50 dark:hover:border-gray-700/50'
                ]"
                @click="isMobileSidebarOpen = false" 
              >
                <span 
                  v-if="isActive(menu.path)" 
                  class="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full shadow-lg"
                ></span>
                
                <span 
                  class="mr-4 transition-all duration-300 group-hover:scale-110 flex-shrink-0"
                  :class="isActive(menu.path) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 group-hover:text-blue-500'"
                >
                  <svg v-if="menu.icon === 'home'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                  <svg v-else-if="menu.icon === 'users'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                  <svg v-else-if="menu.icon === 'tag'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
                  <svg v-else-if="menu.icon === 'link'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                  <svg v-else-if="menu.icon === 'folder'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                  <svg v-else-if="menu.icon === 'user'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                </span>
                
                <span 
                  class="font-semibold text-[15px] transition-all duration-300 whitespace-nowrap overflow-hidden"
                  :class="isDesktopSidebarOpen ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0'"
                >
                  {{ menu.name }}
                </span>
                
                <div 
                  class="ml-auto w-2 h-2 bg-blue-500 rounded-full transition-all duration-300 flex-shrink-0"
                  :class="isActive(menu.path) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
                ></div>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </nav>

      <!-- Footer Sidebar -->
      <div 
        class="p-5 border-t border-gray-100/60 dark:border-gray-800/60 text-center transition-all duration-300 flex-shrink-0"
        :class="isDesktopSidebarOpen ? 'opacity-100' : 'opacity-0'"
      >
        <p class="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Sikap v1.0</p>
      </div>
    </aside>

    <!-- Main Content -->
    <div 
      class="flex-1 flex flex-col min-w-0 transition-all duration-400 ease-out w-full"
      :class="isDesktopSidebarOpen ? 'lg:ml-0' : 'lg:ml-0'"
    >
      <!-- Header -->
      <header class="h-20 bg-white/98 dark:bg-gray-900/98 border-b border-gray-200/60 dark:border-gray-800/60 flex justify-between items-center px-5 lg:px-7 shadow-sm sticky top-0 z-20 backdrop-blur-xl">
        <div class="flex items-center gap-4">
          <button 
            @click.stop="toggleMobileSidebar" 
            class="lg:hidden p-2.5 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50/80 dark:hover:bg-blue-900/20 transition-all duration-300 shadow-sm"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <button 
            @click.stop="toggleDesktopSidebar" 
            class="hidden lg:flex p-2.5 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50/80 dark:hover:bg-blue-900/20 transition-all duration-300 shadow-sm"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 6h16M4 12h16M4 18h7"/>
            </svg>
          </button>
          <div class="hidden lg:block">
            <h1 class="text-lg font-bold text-gray-800 dark:text-white">{{ $t('header.title') }}</h1>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">{{ $t('header.subtitle') }}</p>
          </div>
        </div>

        <!-- Header Actions -->
        <div class="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          <NotificationBell />

          <!-- Profile Menu -->
          <div class="relative">
            <button 
              @click.stop="toggleProfileMenu" 
              class="flex items-center gap-3 hover:bg-gray-50/90 dark:hover:bg-gray-800/50 p-2.5 rounded-2xl transition-all duration-300 focus:outline-none border border-transparent hover:border-gray-200/50 dark:hover:border-gray-700/50 shadow-sm"
            >
              <div class="text-right hidden sm:block">
                <div class="text-[15px] font-bold text-gray-800 dark:text-white leading-tight">{{ user.name }}</div>
                <div class="text-xs font-semibold text-blue-600 dark:text-blue-400 leading-tight">{{ user.role }}</div>
              </div>
              <div class="relative">
                <div class="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 shadow-lg">
                  <div class="h-full w-full rounded-xl bg-white dark:bg-gray-800 overflow-hidden flex items-center justify-center backdrop-blur-sm">
                    <img v-if="user.photo" :src="user.photo" class="w-full h-full object-cover" />
                    <span v-else class="text-blue-600 dark:text-blue-300 font-bold text-[15px]">{{ user.initial }}</span>
                  </div>
                </div>
                <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 shadow-md"></div>
              </div>
              <svg 
                class="w-4 h-4 text-gray-500 transition-all duration-300 flex-shrink-0" 
                :class="showProfileMenu ? 'rotate-180 text-blue-500' : ''" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <!-- Profile Dropdown -->
            <transition 
              enter-active-class="transition-all duration-250 ease-out" 
              enter-from-class="transform opacity-0 scale-95 -translate-y-2" 
              enter-to-class="transform opacity-100 scale-100 translate-y-0" 
              leave-active-class="transition-all duration-200 ease-in" 
              leave-from-class="transform opacity-100 scale-100 translate-y-0" 
              leave-to-class="transform opacity-0 scale-95 -translate-y-2"
            >
              <div 
                v-if="showProfileMenu" 
                class="absolute right-0 mt-3 w-64 bg-white/98 dark:bg-gray-900/98 rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-800/60 py-3 z-50 origin-top-right backdrop-blur-xl"
              >
                <div class="px-5 py-3 border-b border-gray-200/60 dark:border-gray-800/60 sm:hidden">
                  <p class="text-[15px] font-bold text-gray-900 dark:text-white truncate">{{ user.name }}</p>
                  <p class="text-sm font-semibold text-gray-500 dark:text-gray-400 truncate">{{ user.role }}</p>
                </div>
                <div class="py-2">
                  <NuxtLink 
                    :to="localePath('/dashboard/profile')" 
                    class="flex items-center px-5 py-3 text-[15px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-blue-50/80 dark:hover:bg-gray-800/80 hover:text-blue-600 transition-all duration-300 group"
                  >
                    <span class="mr-3 text-gray-500 group-hover:text-blue-500 transition-colors duration-300 text-lg">👤</span> 
                    {{ $t('menu.profile') }}
                  </NuxtLink>
                  <NuxtLink 
                    :to="localePath('/dashboard/settings')" 
                    class="flex items-center px-5 py-3 text-[15px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-blue-50/80 dark:hover:bg-gray-800/80 hover:text-blue-600 transition-all duration-300 group"
                  >
                    <span class="mr-3 text-gray-500 group-hover:text-blue-500 transition-colors duration-300 text-lg">⚙️</span> 
                    {{ $t('header.settings') }}
                  </NuxtLink>
                </div>
                <div class="border-t border-gray-200/60 dark:border-gray-800/60 my-2"></div>
                <div class="py-2">
                  <button 
                    @click="onLogoutClick" 
                    class="flex w-full items-center px-5 py-3 text-[15px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-900/20 transition-all duration-300 group"
                  >
                    <span class="mr-3 transition-transform duration-300 group-hover:scale-110 text-lg">🚪</span> 
                    {{ $t('header.logout') }}
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="flex-1 overflow-y-auto p-5 lg:p-7 bg-gray-50/50 dark:bg-gray-950/50 backdrop-blur-sm">
        <div class="max-w-7xl mx-auto w-full">
          <slot />
        </div>
      </main>
    </div>

    <!-- Logout Confirmation Modal -->
    <Transition 
      enter-active-class="transition-all duration-300 ease-out" 
      enter-from-class="transform opacity-0 scale-95" 
      enter-to-class="transform opacity-100 scale-100" 
      leave-active-class="transition-all duration-200 ease-in" 
      leave-from-class="transform opacity-100 scale-100" 
      leave-to-class="transform opacity-0 scale-95"
    >
      <div 
        v-if="showLogoutConfirm" 
        class="fixed inset-0 z-50 flex items-center justify-center p-5"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" @click="showLogoutConfirm = false"></div>
        <div class="bg-white/98 dark:bg-gray-900/98 rounded-2xl shadow-2xl w-full max-w-md relative z-10 p-7 text-center transform transition-all border border-gray-200/60 dark:border-gray-800/60 backdrop-blur-xl">
          <div class="w-16 h-16 bg-red-100/80 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5 shadow-lg">
            <span>👋</span>
          </div>
          <h3 class="font-bold text-xl text-gray-800 dark:text-white mb-3">{{ $t('header.logout_title') }}</h3>
          <p class="text-[15px] font-medium text-gray-500 dark:text-gray-400 mb-7 leading-relaxed">{{ $t('header.logout_desc') }}</p>
          <div class="flex gap-4">
            <button 
              @click="showLogoutConfirm = false" 
              class="flex-1 py-3.5 border border-gray-300/60 dark:border-gray-600/60 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50/90 dark:hover:bg-gray-800/50 font-bold transition-all duration-300 shadow-sm"
            >
              {{ $t('common.cancel') }}
            </button>
            <button 
              @click="confirmLogout" 
              class="flex-1 py-3.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold shadow-lg transition-all duration-300 hover:shadow-xl"
            >
              {{ $t('common.yes') }}, {{ $t('header.logout') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <ChatWidget />
    
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { 
  width: 6px; 
}
.custom-scrollbar::-webkit-scrollbar-track { 
  background: transparent; 
  margin: 8px 0;
}
.custom-scrollbar::-webkit-scrollbar-thumb { 
  background: linear-gradient(to bottom, #3b82f6, #8b5cf6); 
  border-radius: 12px; 
  border: 1px solid rgba(255,255,255,0.1);
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover { 
  background: linear-gradient(to bottom, #2563eb, #7c3aed); 
}

/* Smooth transitions for all elements */
* { 
  transition-property: color, background-color, border-color, transform, opacity, max-width, max-height, box-shadow; 
  transition-duration: 300ms; 
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); 
}

/* Enhanced font weights */
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }

/* Improved focus states */
button:focus-visible,
a:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-radius: 12px;
}

/* Better hover effects */
.hover-lift:hover {
  transform: translateY(-2px);
}

/* Desktop sidebar improvements */
@media (min-width: 1024px) {
  .lg\:relative {
    position: relative;
  }
  
  .lg\:flex {
    display: flex;
  }
  
  .lg\:hidden {
    display: none;
  }
  
  .lg\:w-80 {
    width: 20rem;
  }
  
  .lg\:w-0 {
    width: 0;
  }
  
  .lg\:ml-0 {
    margin-left: 0;
  }
}

/* Mobile sidebar improvements */
@media (max-width: 1023px) {
  .fixed {
    position: fixed;
  }
  
  .-translate-x-full {
    transform: translateX(-100%);
  }
  
  .translate-x-0 {
    transform: translateX(0);
  }
}
</style>