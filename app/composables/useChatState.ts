export const useChatState = () => {
  // Gunakan useState agar reaktif antar komponen
  const isOpen = useState<boolean>('chat_is_open', () => false)
  const targetUser = useState<any>('chat_target_user', () => null)

  const openChatWith = (user: any) => {
    targetUser.value = {
      partnerId: user.id,
      name: user.name,
      photo: user.photoProfile || user.photo,
      role: user.role?.name || user.role || 'User'
    }
    isOpen.value = true
  }

  return {
    isOpen,
    targetUser,
    openChatWith
  }
}