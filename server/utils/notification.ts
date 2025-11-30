import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const createNotification = async (
  userId: number, 
  title: string, 
  message: string, 
  link: string | null = null
) => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        link,
        isRead: false
      }
    })
  } catch (error) {
    console.error("Gagal membuat notifikasi:", error)
  }
}