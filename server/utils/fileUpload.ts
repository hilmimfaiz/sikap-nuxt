import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export const saveFile = async (file: any) => {
  // 1. Tentukan lokasi simpan (public/uploads)
  // process.cwd() adalah root proyek (tempat nuxt.config.ts berada)
  const uploadDir = join(process.cwd(), 'public', 'uploads')
  
  // Buat folder jika belum ada (recursive: true akan membuat folder induk jika hilang)
  await mkdir(uploadDir, { recursive: true })

  // 2. Generate nama file unik
  const originalName = file.filename || 'file.bin'
  // Ambil ekstensi (handle case file tanpa ekstensi)
  const ext = originalName.includes('.') ? originalName.split('.').pop() : ''
  const uniqueName = `${randomUUID()}${ext ? '.' + ext : ''}`
  
  // Path lengkap tempat file disimpan
  const savePath = join(uploadDir, uniqueName)

  // 3. Simpan file fisik (file.data adalah buffer)
  await writeFile(savePath, file.data)

  // 4. Return path relatif untuk database
  return {
    filePath: `/uploads/${uniqueName}`, // URL yang bisa diakses publik
    fileName: originalName,
    fileType: ext || 'unknown',
    fileSize: file.data.length
  }
}