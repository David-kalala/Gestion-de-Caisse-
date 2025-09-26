import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
  const email = 'admin@caisse.local'
  const exists = await prisma.appUser.findUnique({ where: { email } })
  if (!exists) {
    const passwordHash = await bcrypt.hash('admin', 10)
    await prisma.appUser.create({
      data: {
        name: 'Admin',
        email,
        passwordHash,
        role: 'ADMIN',
        approved: true
      }
    })
    console.log('Seed: admin@caisse.local / admin')
  } else {
    console.log('Admin already seeded')
  }
}

main().finally(() => prisma.$disconnect())
