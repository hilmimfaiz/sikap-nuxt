export default defineEventHandler(async (event) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        // [FIX] Hapus 'archives: true' karena relasinya sudah dihapus dari schema
        _count: {
          select: { 
            links: true // Hanya hitung jumlah link
          }
        },
        inCharge: {
          select: { name: true, email: true }
        }
      },
      orderBy: { name: 'asc' }
    })
    return categories
  } catch (error) {
    // Log error detail ke terminal server untuk debugging
    console.error('Error fetching categories:', error)
    throw createError({ statusCode: 500, message: 'Gagal mengambil kategori' })
  }
})