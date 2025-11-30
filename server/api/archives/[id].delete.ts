import { unlink } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const userCookie = getCookie(event, 'user_data')

  if (!id || !userCookie) throw createError({ statusCode: 400, message: 'Request tidak valid' })
  const user = JSON.parse(userCookie)

  try {
    // 1. Cari File di Database
    const archive = await prisma.archive.findUnique({
      where: { id: parseInt(id) }
    })

    if (!archive) throw createError({ statusCode: 404, message: 'File tidak ditemukan' })

    // 2. Cek Hak Akses (Hanya Admin atau Pemilik yang boleh hapus)
    if (user.role !== 'admin' && archive.uploaderId !== user.id) {
      throw createError({ statusCode: 403, message: 'Anda tidak berhak menghapus file ini' })
    }

    // 3. Hapus File Fisik dari Folder Public
    // Path di DB: /uploads/namafile.ext
    try {
      const filePath = join(process.cwd(), 'public', archive.filePath)
      await unlink(filePath)
    } catch (e) {
      // Lanjut saja jika file fisik sudah hilang duluan
      console.warn('File fisik tidak ditemukan, melanjutkan penghapusan database.')
    }

    // 4. Hapus Record dari Database
    await prisma.archive.delete({
      where: { id: parseInt(id) }
    })

    return { message: 'File berhasil dihapus' }

  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message })
  }
})