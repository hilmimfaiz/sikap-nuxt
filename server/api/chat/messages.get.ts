import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const userCookie = getCookie(event, 'user_data')
  if (!userCookie) throw createError({ statusCode: 401 })
  const currentUser = JSON.parse(userCookie)

  const query = getQuery(event)
  const partnerId = parseInt(query.partnerId as string)

  if (!partnerId) return []

  // Ambil pesan antara user login dan partner
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: currentUser.id, receiverId: partnerId },
        { senderId: partnerId, receiverId: currentUser.id }
      ]
    },
    orderBy: { createdAt: 'asc' }
  })

  // Tandai pesan dari partner sebagai 'read' (dibaca)
  await prisma.message.updateMany({
    where: { senderId: partnerId, receiverId: currentUser.id, isRead: false },
    data: { isRead: true }
  })

  return messages
})