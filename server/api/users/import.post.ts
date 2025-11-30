export default defineEventHandler(async (event) => {
  try {
    // 1. Cek Hak Akses (Authorization)
    const userCookie = getCookie(event, 'user_data')
    if (!userCookie) {
      throw createError({ statusCode: 401, message: 'Unauthorized: Silakan login terlebih dahulu.' })
    }
    
    const user = JSON.parse(userCookie)

    // Proteksi: Viewer tidak boleh melakukan import
    if (user.role === 'viewer') {
      throw createError({ statusCode: 403, message: 'Akses ditolak: Viewer tidak memiliki izin import data.' })
    }

    // 2. Baca File Upload (Multipart)
    const files = await readMultipartFormData(event)
    
    if (!files || files.length === 0) {
      throw createError({ statusCode: 400, message: 'File CSV wajib diunggah.' })
    }

    const csvFile = files.find(f => f.name === 'file')
    
    // Validasi ekstensi file
    if (!csvFile || !csvFile.filename?.toLowerCase().endsWith('.csv')) {
      throw createError({ statusCode: 400, message: 'Format file harus .csv' })
    }

    // 3. Parse Konten CSV
    const csvString = csvFile.data.toString('utf-8')
    // Pisahkan baris (handle CRLF windows dan LF unix)
    const lines = csvString.split(/\r?\n/).filter(line => line.trim() !== '')
    
    // Hapus baris pertama (Header: Title,Url,Category)
    const dataRows = lines.slice(1)
    
    if (dataRows.length === 0) {
      throw createError({ statusCode: 400, message: 'File CSV kosong atau hanya berisi header.' })
    }

    let successCount = 0
    let failCount = 0

    // 4. Loop dan Proses Data
    for (const row of dataRows) {
      // Split berdasarkan koma (Simple CSV Parser)
      // Note: Ini parser sederhana. Jika ada koma di dalam judul, struktur bisa bergeser.
      const cols = row.split(',').map(item => item?.trim())

      // Pastikan minimal ada Title dan URL
      if (cols.length < 2) {
        failCount++
        continue
      }

      const title = cols[0]
      const url = cols[1]
      const categoryName = cols[2] // Opsional

      if (!title || !url) {
        failCount++
        continue
      }

      try {
        // A. Logika Kategori (Cari atau Buat)
        let categoryId: number
        
        // Jika kategori kosong di CSV, gunakan 'Umum'
        const targetCategoryName = categoryName && categoryName !== '' ? categoryName : 'Umum'

        // Cari kategori di DB (Case insensitive search simulation)
        // Prisma SQLite/MySQL default behavior bisa beda, kita cari exact name dulu
        let existingCat = await prisma.category.findFirst({
          where: { name: targetCategoryName }
        })

        if (existingCat) {
          categoryId = existingCat.id
        } else {
          // Jika belum ada, buat kategori baru
          const newCat = await prisma.category.create({
            data: { name: targetCategoryName }
          })
          categoryId = newCat.id
        }

        // B. Simpan Link
        await prisma.link.create({
          data: {
            title,
            url,
            categoryId,
            isActive: true // Default langsung aktif
          }
        })
        
        successCount++

      } catch (err) {
        console.error(`Gagal import baris: ${row}`, err)
        failCount++
      }
    }

    // 5. Return Response
    return {
      success: true,
      message: `Import selesai. Berhasil: ${successCount}, Gagal/Dilewati: ${failCount}`,
      meta: {
        total: dataRows.length,
        success: successCount,
        failed: failCount
      }
    }

  } catch (error: any) {
    // Error handling global untuk endpoint ini
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Terjadi kesalahan saat memproses file CSV.'
    })
  }
})