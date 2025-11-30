export default defineEventHandler(async (event) => {
  const userCookie = getCookie(event, 'user_data')
  if (!userCookie) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const user = JSON.parse(userCookie)

  // [UPDATE] Hapus pengecekan role viewer. Semua user boleh buat folder.
  
  const body = await readBody(event)
  if (!body.name) throw createError({ statusCode: 400, message: 'Nama folder wajib diisi' })

  try {
    const folder = await prisma.folder.create({
      data: {
        name: body.name,
        userId: user.id // Selalu gunakan ID user yang login sebagai pemilik
      }
    })
    return folder
  } catch (error) {
    throw createError({ statusCode: 500, message: 'Gagal membuat folder' })
  }
})