import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const userCookie = getCookie(event, 'user_data')
  if (!userCookie) throw createError({ statusCode: 401 })
  const currentUser = JSON.parse(userCookie)

  // Hanya admin yang butuh list percakapan
  if (currentUser.role !== 'admin') {
    // Jika user biasa memanggil ini, return array kosong atau error
    return [] 
  }

  // Ambil semua pesan yang melibatkan admin
  const messages = await prisma.message.findMany({
    where: { 
      OR: [
        { receiverId: currentUser.id },
        { senderId: currentUser.id }
      ]
    },
    include: {
      sender: { select: { id: true, name: true, photoProfile: true, role: { select: { name: true } } } },
      receiver: { select: { id: true, name: true, photoProfile: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Grouping pesan berdasarkan lawan bicara (partner)
  const conversations = new Map()

  messages.forEach(msg => {
    // Tentukan siapa lawan bicaranya
    const partner = msg.senderId === currentUser.id ? msg.receiver : msg.sender
    
    // Masukkan ke map jika belum ada (karena sort desc, yang pertama masuk adalah pesan terbaru)
    if (!conversations.has(partner.id)) {
      conversations.set(partner.id, {
        partnerId: partner.id,
        name: partner.name,
        photo: partner.photoProfile,
        role: (partner as any).role?.name || 'user',
        lastMessage: msg.content,
        timestamp: msg.createdAt,
        unreadCount: (msg.receiverId === currentUser.id && !msg.isRead) ? 1 : 0
      })
    } else {
      // Jika sudah ada, cukup tambahkan counter unread jika pesan masuk belum dibaca
      if (msg.receiverId === currentUser.id && !msg.isRead) {
        const conv = conversations.get(partner.id)
        conv.unreadCount += 1
      }
    }
  })

  return Array.from(conversations.values())
})