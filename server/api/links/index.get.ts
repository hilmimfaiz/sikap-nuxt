export default defineEventHandler(async (event) => {
  try {
    const links = await prisma.link.findMany({
      include: { category: true },
      orderBy: { id: 'desc' }
    })
    return links
  } catch (error) {
    throw createError({ statusCode: 500, message: 'Gagal mengambil data link' })
  }
})