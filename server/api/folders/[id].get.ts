export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')
  const userCookie = getCookie(event, 'user_data')
  
  if (!idParam || !userCookie) throw createError({ statusCode: 400, message: 'Invalid Request' })

  const user = JSON.parse(userCookie)
  const folderId = parseInt(idParam)
  
  // FIX: Pastikan user.id dari cookie di-parse sebagai integer untuk perbandingan ketat
  const currentUserId = user.id ? parseInt(user.id) : null 

  if (!currentUserId) throw createError({ statusCode: 401, message: 'Unauthorized: User ID invalid' })

  try {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        archives: {
          include: {
            uploader: { select: { name: true } },
            // [PENTING] Ambil info sharing file untuk filtering
            fileShares: { select: { userId: true } } 
          },
          orderBy: { createdAt: 'desc' }
        },
        user: { select: { id: true, name: true, email: true } }, // Owner
        shares: { select: { userId: true } }, // Daftar User yang dishare folder ini
        _count: { select: { archives: true } }
      }
    })
    
    if (!folder) throw createError({ statusCode: 404, message: 'Folder tidak ditemukan' })

    // Cek Hak Akses Folder
    const isOwner = folder.userId === currentUserId
    const isAdmin = user.role === 'admin'
    const isShared = folder.shares.some(s => s.userId === currentUserId)

    // Jika user tidak memiliki salah satu akses di atas, tolak
    if (!isOwner && !isAdmin && !isShared) {
      throw createError({ statusCode: 403, message: 'Akses ditolak' })
    }
    
    // --- START: Implementasi Logika File Sharing Independen ---
    
    // Logika Filtering File: Hanya berlaku jika user BUKAN Owner dan BUKAN Admin
    if (!isOwner && !isAdmin) {
      // Filter archives: hanya tampilkan file yang di-share secara eksplisit ke user ini
      folder.archives = folder.archives.filter(archive => {
        // Cek apakah file ini di-share ke user saat ini
        const isFileShared = archive.fileShares.some(s => s.userId === currentUserId)
        
        // Kembalikan file jika secara eksplisit di-share.
        return isFileShared
      })
    }
    
    // Hapus properti fileShares dari setiap arsip sebelum dikirim ke klien
    // Ini agar data tetap bersih dan tidak bocor ke frontend.
    // Kita harus membuat salinan objek karena properti yang di-select oleh Prisma bersifat Readonly/Immutable.
    // @ts-ignore
    folder.archives = folder.archives.map(archive => {
        // Pisahkan fileShares (yang tidak dibutuhkan klien) dari data arsip
        // @ts-ignore
        const { fileShares, ...safeArchive } = archive 
        return safeArchive
    })

    // --- END: Implementasi Logika File Sharing Independen ---

    return folder
  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message })
  }
})