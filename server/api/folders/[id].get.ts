import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')
  const userCookie = getCookie(event, 'user_data')
  
  if (!idParam || !userCookie) throw createError({ statusCode: 400, message: 'Invalid Request' })

  const user = JSON.parse(userCookie)
  const folderId = parseInt(idParam)
  const currentUserId = user.id ? parseInt(user.id) : null 

  if (!currentUserId) throw createError({ statusCode: 401, message: 'Unauthorized' })

  // --- 1. Ambil Parameter Pagination & Search ---
  const { page, limit, search } = getQuery(event)
  const pageNumber = page ? parseInt(String(page)) : 1
  const limitNumber = limit ? parseInt(String(limit)) : 10
  const skip = (pageNumber - 1) * limitNumber
  const searchQuery = search ? String(search) : ''

  try {
    // --- 2. Cek Eksistensi Folder & Hak Akses (Query Ringan) ---
    const folderBasic = await prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        shares: { select: { userId: true } }
      }
    })
    
    if (!folderBasic) throw createError({ statusCode: 404, message: 'Folder tidak ditemukan' })

    const isOwner = folderBasic.userId === currentUserId
    const isAdmin = user.role === 'admin'
    const isShared = folderBasic.shares.some(s => s.userId === currentUserId)

    if (!isOwner && !isAdmin && !isShared) {
      throw createError({ statusCode: 403, message: 'Akses ditolak' })
    }

    // --- 3. Bangun Query Filter Arsip ---
    const archiveWhere: any = {
      folderId: folderId
    }

    // A. Filter Search (Jika ada)
    if (searchQuery) {
      archiveWhere.OR = [
        { title: { contains: searchQuery } },
        { fileType: { contains: searchQuery } },
        { uploader: { name: { contains: searchQuery } } }
      ]
    }

    // B. Filter Hak Akses File (Jika user biasa & bukan owner folder)
    if (!isOwner && !isAdmin) {
      archiveWhere.fileShares = {
        some: { userId: currentUserId }
      }
    }

    // --- 4. Eksekusi Query (Transaction: Count & Data) ---
    const [totalArchives, folderData] = await prisma.$transaction([
      // Hitung total data sesuai filter (untuk pagination)
      prisma.archive.count({ where: archiveWhere }),
      
      // Ambil data folder beserta arsip yang sudah dipaginasi
      prisma.folder.findUnique({
        where: { id: folderId },
        include: {
          archives: {
            where: archiveWhere,
            skip: skip,
            take: limitNumber,
            orderBy: { createdAt: 'desc' },
            include: {
              uploader: { select: { name: true } },
              fileShares: { select: { userId: true } } // Diperlukan untuk logika frontend (checkbox share)
            }
          },
          user: { select: { id: true, name: true, email: true } },
          shares: { select: { userId: true } },
          _count: { select: { archives: true } }
        }
      })
    ])

    if (!folderData) throw createError({ statusCode: 404, message: 'Folder data error' })

    // --- 5. Return Response dengan Meta Pagination ---
    return {
      folder: folderData, // Folder object yang berisi arsip (halaman ini saja)
      meta: {
        total: totalArchives,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalArchives / limitNumber)
      }
    }

  } catch (error: any) {
    throw createError({ statusCode: error.statusCode || 500, message: error.message })
  }
})