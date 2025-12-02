import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  // 1. Cek User Login
  const userCookie = getCookie(event, 'user_data')
  if (!userCookie) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const currentUser = JSON.parse(userCookie)

  // 2. Ambil Sender ID dari body (Lawan bicara kita)
  const body = await readBody(event)
  const { senderId } = body

  if (!senderId) throw createError({ statusCode: 400, statusMessage: 'Sender ID required' })

  try {
    // 3. Update pesan:
    // "Ubah jadi terbaca (isRead=true) UNTUK pesan yang dikirim oleh (senderId) KEPADA saya (currentUser.id)"
    const updated = await prisma.message.updateMany({
      where: {
        senderId: parseInt(senderId), // Pengirim pesan (teman chat)
        receiverId: currentUser.id,   // Penerima (kita sendiri)
        isRead: false                 // Hanya yang belum dibaca
      },
      data: {
        isRead: true
      }
    })

    return { success: true, count: updated.count }
  } catch (error) {
    console.error('Error marking messages as read:', error)
    throw createError({ statusCode: 500, statusMessage: 'Gagal update status pesan' })
  }
})