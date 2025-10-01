import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
const prisma = new PrismaClient()

function makeCode(n = 6) {
  return crypto.randomBytes(8).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, n).toUpperCase()
}
async function generateUniqueRef(prefix = 'RET') {
  while (true) {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const code = makeCode(6)
    const ref = `${prefix}-${y}${m}${day}-${code}`
    const exists = await prisma.operation.findFirst({ where: { reference: ref } })
    if (!exists) return ref
  }
}

async function main() {
  const toFix = await prisma.operation.findMany({
    where: { type: 'RETRAIT', OR: [{ reference: null }, { reference: '' }] },
    select: { id: true }
  })
  console.log(`Retraits à backfiller: ${toFix.length}`)
  for (const row of toFix) {
    const reference = await generateUniqueRef('RET')
    await prisma.operation.update({ where: { id: row.id }, data: { reference } })
    console.log(`OK: ${row.id} -> ${reference}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
