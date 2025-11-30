export default defineEventHandler(async (event) => {
  try {
    const userCookie = getCookie(event, 'user_data')
    if (!userCookie) throw createError({ statusCode: 401, message: 'Unauthorized' })
    const user = JSON.parse(userCookie)

    let whereCondition: any = {}

    // Jika BUKAN admin, filter folder:
    // 1. Milik saya sendiri (userId == user.id)
    // 2. ATAU Yang dibagikan ke saya (shares contains user.id)
    if (user.role !== 'admin') {
      whereCondition = {
        OR: [
          { userId: user.id },
          { shares: { some: { userId: user.id } } }
        ]
      }
    }

    const folders = await prisma.folder.findMany({
      where: whereCondition,
      include: {
        _count: { select: { archives: true } },
        user: { select: { name: true } }, // Pemilik Folder
        shares: { select: { userId: true } } // Cek apakah dishare (opsional)
      },
      orderBy: { createdAt: 'desc' }
    })

    return folders
  } catch (error) {
    throw createError({ statusCode: 500, message: 'Gagal memuat folder' })
  }
})