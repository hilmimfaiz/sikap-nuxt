import { createNotification } from '../../utils/notification'

// Fungsi saveFile otomatis ter-import dari server/utils/fileUpload.ts

export default defineEventHandler(async (event) => {
  try {
    const files = await readMultipartFormData(event)
    if (!files) throw createError({ statusCode: 400, message: 'Data tidak valid' })

    // Helper ambil value form
    const getValue = (name: string) => {
      const field = files.find(f => f.name === name)
      return field ? field.data.toString() : null
    }

    const id = getValue('id')
    const name = getValue('name')
    const email = getValue('email')

    if (!id) throw createError({ statusCode: 400, message: 'ID User diperlukan' })

    // 1. Siapkan Data Update
    const updateData: any = {
      name: name,
      email: email
    }

    // 2. Cek File Foto (Jika ada upload baru)
    let isPhotoUpdated = false
    const photoFile = files.find(f => f.name === 'photo' && f.filename)
    
    if (photoFile) {
      if (!photoFile.type?.startsWith('image/')) {
        throw createError({ statusCode: 400, message: 'File harus berupa gambar' })
      }
      const savedFile = await saveFile(photoFile)
      updateData.photoProfile = savedFile.filePath
      isPhotoUpdated = true
    }

    // 3. Update Database
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true, 
        name: true, 
        email: true, 
        photoProfile: true,
        role: { select: { name: true } }, 
        createdAt: true
      }
    })

    // 4. KIRIM NOTIFIKASI
    // Tentukan pesan notifikasi berdasarkan apa yang diubah
    let notifTitle = 'Profil Diperbarui'
    let notifMessage = 'Informasi nama atau email Anda berhasil diperbarui.'

    if (isPhotoUpdated) {
      notifTitle = 'Foto Profil Baru'
      notifMessage = 'Foto profil Anda berhasil diubah dan diperbarui.'
    }

    // Kirim notifikasi ke user yang bersangkutan
    await createNotification(
      updatedUser.id,
      notifTitle,
      notifMessage,
      '/dashboard/profile' // Link kembali ke profil
    )

    // [FIX] Flatten object agar struktur sama persis dengan Login
    const userResponse = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      photoProfile: updatedUser.photoProfile,
      role: updatedUser.role.name, 
      createdAt: updatedUser.createdAt
    }

    return {
      message: 'Profil berhasil diperbarui',
      user: userResponse
    }

  } catch (error: any) {
    if (error.code === 'P2002') {
      throw createError({ statusCode: 400, message: 'Email sudah digunakan user lain' })
    }
    throw createError({ 
      statusCode: error.statusCode || 500, 
      message: error.message || 'Gagal update profil' 
    })
  }
})