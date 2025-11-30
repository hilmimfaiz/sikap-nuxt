export default defineEventHandler(async (event) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        photoProfile: true,
        isActive: true,
        role: { select: { name: true } },
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return users
  } catch (error) {
    throw createError({ statusCode: 500, message: 'Gagal mengambil data user' })
  }
})