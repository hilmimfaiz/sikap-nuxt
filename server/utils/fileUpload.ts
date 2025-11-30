import { v2 as cloudinary } from 'cloudinary'

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
})

export const saveFile = async (file: any) => {
  // Validasi file input
  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: 'File tidak valid' })
  }

  // Convert Buffer ke Base64 agar bisa diupload via API Cloudinary
  const base64Data = Buffer.from(file.data).toString('base64')
  const fileType = file.type || 'application/octet-stream' // mime type
  const dataURI = `data:${fileType};base64,${base64Data}`

  // Tentukan folder di Cloudinary (Opsional, agar rapi)
  const options = {
    folder: 'sikap_uploads',
    public_id: file.filename ? file.filename.split('.')[0] + '_' + Date.now() : undefined,
    resource_type: 'auto' as const // auto mendeteksi apakah image/video/raw (pdf dll)
  }

  try {
    // Proses Upload ke Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, options)

    // Return format yang sesuai dengan struktur database Anda
    return {
      filePath: result.secure_url, // URL HTTPS langsung dari Cloudinary
      fileName: file.filename || result.public_id,
      fileType: result.format || 'unknown',
      fileSize: result.bytes
    }
  } catch (error: any) {
    console.error('Cloudinary Upload Error:', error)
    throw createError({ 
      statusCode: 500, 
      message: 'Gagal mengupload file ke Cloudinary' 
    })
  }
}