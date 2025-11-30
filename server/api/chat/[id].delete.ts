import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const userCookie = getCookie(event, 'user_data')
  if (!userCookie) throw createError({ statusCode: 401 })
  const currentUser = JSON.parse(userCookie)

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'ID pesan diperlukan' })

  const messageId = parseInt(id)

  // 1. Cek Pesan
  const message = await prisma.message.findUnique({
    where: { id: messageId }
  })

  if (!message) throw createError({ statusCode: 404, message: 'Pesan tidak ditemukan' })

  // 2. Validasi Hak Akses
  // Hanya pengirim pesan yang boleh menghapus pesannya sendiri
  // (Opsional: Admin boleh menghapus pesan siapapun, tambahkan logika OR jika perlu)
  if (message.senderId !== currentUser.id) {
    throw createError({ statusCode: 403, message: 'Anda tidak berhak menghapus pesan ini' })
  }

  // 3. Hapus Pesan
  await prisma.message.delete({
    where: { id: messageId }
  })

  return { success: true, message: 'Pesan dihapus' }
})