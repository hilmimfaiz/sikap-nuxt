// Fungsi saveFile otomatis ter-import dari server/utils/fileUpload.ts
// Catatan: Pastikan fungsi getCookie dan JSON.parse(cookie) tersedia di server environment Anda.

export default defineEventHandler(async (event) => {
  try {
    // 1. Validasi User
    const userCookie = getCookie(event, 'user_data')
    if (!userCookie) throw createError({ statusCode: 401, message: 'Login diperlukan' })
    const user = JSON.parse(userCookie)

    // 2. Baca Multipart Form
    const files = await readMultipartFormData(event)
    if (!files) throw createError({ statusCode: 400, message: "Tidak ada file diunggah" })

    const uploadedFile = files.find(f => f.name === 'file')
    const folderId = files.find(f => f.name === 'folderId')?.data.toString()
    const title = files.find(f => f.name === 'title')?.data.toString()

    if (!uploadedFile || !folderId) {
      throw createError({ statusCode: 400, message: "File dan Folder wajib ada" })
    }

    // 3. CEK VALIDITAS FOLDER TUJUAN & KEPEMILIKAN
    const targetFolder = await prisma.folder.findUnique({
      where: { id: parseInt(folderId) }
    })

    if (!targetFolder) throw createError({ statusCode: 404, message: "Folder tujuan tidak ditemukan" })

    // PROTEKSI: Cek apakah user berhak upload ke folder ini
    // Hanya boleh jika Admin ATAU Folder itu milik sendiri
    if (user.role !== 'admin' && targetFolder.userId !== user.id) {
      throw createError({ statusCode: 403, message: "Anda hanya bisa mengupload ke folder milik sendiri." })
    }

    // 4. Simpan Fisik & Database
    const fileInfo = await saveFile(uploadedFile) // Panggil fungsi di server/utils/fileUpload.ts

    const archive = await prisma.archive.create({
      data: {
        title: title || fileInfo.fileName,
        filePath: fileInfo.filePath,
        fileSize: fileInfo.fileSize,
        fileType: fileInfo.fileType,
        folderId: parseInt(folderId),
        uploaderId: user.id
      }
    })

    return archive

  } catch (e: any) {
    // Log error lengkap di console server
    console.error("UPLOAD FILE GAGAL:", e.message || e); 
    throw createError({
      statusCode: e.statusCode || 500,
      message: e.message || "Gagal mengupload arsip. Cek log server."
    })
  }
})