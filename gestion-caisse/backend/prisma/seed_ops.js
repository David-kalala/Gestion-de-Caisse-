// node prisma/seed_ops.js
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()
const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = (arr) => arr[r(0, arr.length - 1)]
const makeCode = (n = 6) =>
  crypto.randomBytes(8).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, n).toUpperCase()

async function generateUniqueRef(prefix = 'VER') {
  while (true) {
    const d = new Date()
    const ref = `${prefix}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${makeCode(6)}`
    const exists = await prisma.operation.findFirst({ where: { reference: ref } })
    if (!exists) return ref
  }
}

function randDateWithin(days = 180) {
  const now = Date.now()
  const past = now - r(0, days) * 86400000
  return new Date(past - r(0, 86400000)) // décale un peu l’heure
}

function amountCDF() {
  // distribution simple mais réaliste (CDF)
  const bases = [50000, 100000, 250000, 500000, 1000000, 2500000]
  return pick(bases) + r(0, 4999) * 100 // centimes
}
function amountUSD() {
  const bases = [20, 50, 100, 250, 500, 1000]
  return (pick(bases) * 100) + r(0, 99) // en cents
}

const PAYEURS = ['Société Alpha', 'Société Beta', 'Logistics RDC', 'Import-Export Kivu', 'Client Anonyme']
const MOTIFS  = ['Taxe d’importation', 'Droit de douane', 'Pénalité retard', 'Traitement dossier', 'Régularisation']
const BENEF   = ['Transco SA', 'Société Y', 'Fournisseur Z', 'Prestataire IT', 'Entretien locaux']
const OBJETS  = ['Paiement facture', 'Achat fournitures', 'Frais transport', 'Maintenance', 'Service externe']

async function ensureUsers() {
  // Crée quelques comptes approuvés pour attribuer les opérations
  const specs = [
    { name: 'Perc 1', email: 'perc1@demo.local', role: 'PERCEPTEUR' },
    { name: 'Perc 2', email: 'perc2@demo.local', role: 'PERCEPTEUR' },
    { name: 'Compta 1', email: 'compta1@demo.local', role: 'COMPTABLE' },
    { name: 'Manager 1', email: 'manager1@demo.local', role: 'MANAGER' },
  ]
  const out = []
  for (const s of specs) {
    let u = await prisma.appUser.findUnique({ where: { email: s.email } })
    if (!u) {
      u = await prisma.appUser.create({
        data: {
          name: s.name, email: s.email,
          passwordHash: await bcrypt.hash('demo', 12),
          role: s.role, approved: true
        }
      })
    }
    out.push(u)
  }
  return {
    percepteurs: out.filter(u => u.role === 'PERCEPTEUR'),
    comptables:  out.filter(u => u.role === 'COMPTABLE'),
    manager:     out.find(u => u.role === 'MANAGER')
  }
}

async function main() {
  const { percepteurs, comptables, manager } = await ensureUsers()
  const N = Number(process.env.SEED_OPS || 3000) // nombre d’opérations
  console.log(`Seeding ${N} opérations...`)

  const batchSize = 250
  for (let offset = 0; offset < N; offset += batchSize) {
    const opsData = []
    const histData = []
    const max = Math.min(offset + batchSize, N)
    for (let i = offset; i < max; i++) {
      // type & devise
      const type   = Math.random() < 0.6 ? 'VERSEMENT' : 'RETRAIT'
      const devise = Math.random() < 0.7 ? 'CDF' : 'USD'
      const montantCents = devise === 'CDF' ? amountCDF() : amountUSD()
      const dateValeur = randDateWithin(180)

      // statut
      const p = Math.random()
      const statut =
        p < 0.65 ? 'APPROUVE' :
        p < 0.75 ? 'REJETE'   :
        p < 0.80 ? 'ANNULE'   : 'SOUMIS'

      // champs métier + auteur
      let createdBy
      let payload = {}
      if (type === 'VERSEMENT') {
        createdBy = pick(percepteurs)
        payload = { payeur: pick(PAYEURS), motif: pick(MOTIFS), mode: pick(['Espèces','Virement','Chèque','Mobile Money']) }
      } else {
        createdBy = pick(comptables)
        payload = { benef: pick(BENEF), objet: pick(OBJETS), mode: pick(['Espèces','Virement','Chèque','Mobile Money']) }
      }

      const reference = await generateUniqueRef(type === 'VERSEMENT' ? 'VER' : 'RET')
      opsData.push({
        type, devise, montantCents, dateValeur, reference,
        ...payload,
        createdById: createdBy.id,
        statut,
        edited: false,
        createdAt: dateValeur,
        updatedAt: null,
        canceledAt: statut === 'ANNULE' ? new Date(dateValeur.getTime() + 3600_000) : null
      })
    }

    // insert en vrac
    const created = await prisma.$transaction(async (tx) => {
      const inserted = await Promise.all(opsData.map(d => tx.operation.create({ data: d })))
      // Historique minimal : ADD + (DECIDE/CANCEL) si applicable
      for (const o of inserted) {
        const motifOrObjet = o.motif || o.objet
        histData.push({ action: `ADD_${o.type}`, refId: o.id, ts: o.createdAt, devise: o.devise, montantCents: o.montantCents, motif: motifOrObjet })
        if (o.statut === 'APPROUVE' || o.statut === 'REJETE') {
          histData.push({ action: `DECIDE_${o.type}`, refId: o.id, ts: new Date(o.createdAt.getTime() + 2000), devise: o.devise, montantCents: o.montantCents, motif: motifOrObjet, meta: { statut: o.statut } })
        }
        if (o.statut === 'ANNULE') {
          histData.push({ action: `CANCEL_${o.type}`, refId: o.id, ts: o.canceledAt, devise: o.devise, montantCents: o.montantCents, motif: motifOrObjet })
        }
      }
      await tx.history.createMany({ data: histData })
      return inserted.length
    })

    console.log(`+${created} (total ${Math.min(max, N)}/${N})`)
  }

  console.log('OK.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
