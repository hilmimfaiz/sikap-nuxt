import { PrismaClient } from '@prisma/client'
import { createNotification } from '../../utils/notification' // Pastikan helper ini ada

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const userCookie = getCookie(event, 'user_data')
  if (!userCookie) throw createError({ statusCode: 401 })
  const currentUser = JSON.parse(userCookie)

  const body = await readBody(event)
  const { receiverId, content } = body

  if (!receiverId || !content) throw createError({ statusCode: 400 })

  // Simpan pesan ke database
  const message = await prisma.message.create({
    data: {
      content,
      senderId: currentUser.id,
      receiverId: parseInt(receiverId)
    }
  })

  // Kirim notifikasi sistem (lonceng) ke penerima
  await createNotification(
    parseInt(receiverId),
    'Pesan Baru',
    `Anda menerima pesan baru dari ${currentUser.name}`,
    '/dashboard' // Link tujuan saat notifikasi diklik
  )

  return message
})