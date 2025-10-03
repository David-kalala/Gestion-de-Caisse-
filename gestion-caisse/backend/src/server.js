import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from './db.js'

dotenv.config()
const app = express()
app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

// ---------- helpers
const cents = n => Math.round(Number(n) * 100)
const money = c => Number(c) / 100

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const signJwt = (u) => jwt.sign({ sub: u.id, role: u.role, approved: u.approved }, JWT_SECRET, { expiresIn: '8h' })

const auth = (req, res, next) => {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authorization header manquant' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = { id: payload.sub, role: payload.role, approved: payload.approved }
    next()
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Réservé à l’Admin' })
  next()
}

// --- Génération d'une référence unique (VER/RET)
function makeCode(n = 6) {
  return crypto.randomBytes(8).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, n).toUpperCase()
}
async function generateUniqueRef(prefix = 'VER') {
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

// ---------- utils dates (KPI)
function startOfDay(d){ const x = new Date(d); x.setHours(0,0,0,0); return x }
function endOfDay(d){ const x = new Date(d); x.setHours(23,59,59,999); return x }
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate() + n); return x }
function startOfMonth(d){ return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1)) }
function startOfYear(d){ return startOfDay(new Date(d.getFullYear(), 0, 1)) }
function toISODate(d){ return new Date(d).toISOString().slice(0,10) }


async function sumBy(where){
const inAgg = await prisma.operation.aggregate({ _sum: { montantCents: true }, where: { ...where, statut: 'APPROUVE', type: 'VERSEMENT' } })
const outAgg = await prisma.operation.aggregate({ _sum: { montantCents: true }, where: { ...where, statut: 'APPROUVE', type: 'RETRAIT' } })
const i = inAgg._sum.montantCents || 0, o = outAgg._sum.montantCents || 0
return { inSum: money(i), outSum: money(o), solde: money(i - o) }
}

// ---------- auth
app.post('/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nom, email et mot de passe requis' })
    }
    const exists = await prisma.appUser.findUnique({ where: { email } })
    if (exists) return res.status(409).json({ error: 'Email déjà utilisé' })

    const allowed = ['PERCEPTEUR', 'COMPTABLE', 'MANAGER'] // pas ADMIN à la création
    const safeRole = allowed.includes(role) ? role : 'PERCEPTEUR'
    const passwordHash = await bcrypt.hash(password, 10)

    const u = await prisma.appUser.create({
      data: { name, email, passwordHash, role: safeRole, approved: false }
    })
    const token = signJwt(u)
    return res.status(201).json({
      token,
      user: { id: u.id, name: u.name, email: u.email, role: u.role, approved: u.approved }
    })
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
})

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body
  const u = await prisma.appUser.findUnique({ where: { email } })
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) {
    return res.status(401).json({ error: 'Identifiants invalides' })
  }
  const token = signJwt(u)
  res.json({
    token,
    user: { id: u.id, name: u.name, email: u.email, role: u.role, approved: u.approved }
  })
})

app.get('/auth/me', auth, async (req, res) => {
  const u = await prisma.appUser.findUnique({ where: { id: req.user.id } })
  if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' })
  res.json({ id: u.id, name: u.name, email: u.email, role: u.role, approved: u.approved })
})

// ---------- ADMIN: users
app.get('/admin/users', auth, adminOnly, async (_req, res) => {
  const users = await prisma.appUser.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, approved: true, createdAt: true }
  })
  res.json(users)
})

app.post('/admin/users/:id/approve', auth, adminOnly, async (req, res) => {
  const { id } = req.params
  const u = await prisma.appUser.update({ where: { id }, data: { approved: true } })
  await prisma.adminAudit.create({ data: { actorId: req.user.id, action: 'APPROVE_USER', payload: { userId: id } } })
  res.json({ ok: true, user: { id: u.id, approved: u.approved } })
})

const setRoleHandler = async (req, res) => {
  const { id } = req.params
  const { role } = req.body || {}
  const allowed = ['PERCEPTEUR', 'COMPTABLE', 'MANAGER', 'ADMIN']
  if (!allowed.includes(role)) return res.status(400).json({ error: 'Rôle invalide' })
  const u = await prisma.appUser.update({ where: { id }, data: { role } })
  await prisma.adminAudit.create({ data: { actorId: req.user.id, action: 'SET_ROLE', payload: { userId: id, role } } })
  res.json({ ok: true, user: { id: u.id, role: u.role } })
}
app.post('/admin/users/:id/role', auth, adminOnly, setRoleHandler)
app.patch('/admin/users/:id/role', auth, adminOnly, setRoleHandler)

app.delete('/admin/users/:id', auth, adminOnly, async (req, res) => {
  const { id } = req.params
  if (id === req.user.id) return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' })
  await prisma.appUser.delete({ where: { id } })
  await prisma.adminAudit.create({ data: { actorId: req.user.id, action: 'DELETE_USER', payload: { userId: id } } })
  res.json({ ok: true })
})

// ---------- ADMIN: audit
app.get('/admin/audit', auth, adminOnly, async (_req, res) => {
  const rows = await prisma.adminAudit.findMany({
    orderBy: { ts: 'desc' },
    take: 500,
    include: { actor: true }
  })
  res.json(rows.map(a => ({
    id: a.id,
    ts: a.ts,
    actor: a.actor?.email || a.actorId,
    action: a.action,
    payload: a.payload
  })))
})
async function getSoldeCents(devise, tx = prisma) {
  const inSum  = await tx.operation.aggregate({ _sum: { montantCents: true }, where: { statut: 'APPROUVE', type: 'VERSEMENT', devise } })
  const outSum = await tx.operation.aggregate({ _sum: { montantCents: true }, where: { statut: 'APPROUVE', type: 'RETRAIT',   devise } })
  const i = Number(inSum._sum.montantCents || 0), o = Number(outSum._sum.montantCents || 0)
  return i - o
}
// ---------- créer opération
app.post('/operations', auth, async (req, res) => {
  try {
    const { type, devise, montant, date, payeur, motif, benef, objet, mode, createdById } = req.body
    if (!req.user.approved) return res.status(403).json({ error: 'Compte non approuvé' })
    if (createdById && createdById !== req.user.id) return res.status(403).json({ error: 'Actor mismatch' })

    // Références lisibles et uniques pour les 2 types
    const reference =
      type === 'RETRAIT' ? await generateUniqueRef('RET') :
      type === 'VERSEMENT' ? await generateUniqueRef('VER') : null

      //  blocage dès la création si solde approuvé insuffisant
    if (type === 'RETRAIT') {
      const amountCents = cents(montant)
      const solde = await getSoldeCents(devise)
      if (amountCents > solde) {
        return res.status(400).json({ error: `Solde insuffisant en ${devise}. Disponible: ${money(solde)} ${devise}` })
      }
    }

    const o = await prisma.operation.create({
      data: {
        type,
        devise,
        montantCents: cents(montant),
        dateValeur: new Date(date),
        payeur, motif, benef, objet, mode,
        reference,
        createdById: req.user.id
      }
    })
    await prisma.history.create({
      data: { action: `ADD_${type}`, refId: o.id, devise: o.devise, montantCents: o.montantCents, motif: motif ?? objet, actorId: req.user.id }
    })
    res.json(o)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ---------- éditer (seulement SOUMIS, et par auteur/Admin)
app.patch('/operations/:id', auth, async (req, res) => {
  const { id } = req.params
  const o = await prisma.operation.findUnique({ where: { id } })
  if (!o) return res.status(404).json({ error: 'Not found' })
  if (o.statut !== 'SOUMIS') return res.status(400).json({ error: 'Non modifiable' })
  if (o.createdById !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Action réservée au créateur ou Admin' })
  }

  const { devise, montant, date, payeur, motif, benef, objet, mode } = req.body

  // Interdire la modification de la date pour les VERSEMENTS
  const nextDate = (o.type === 'VERSEMENT')
    ? o.dateValeur
    : (date ? new Date(date) : o.dateValeur)

  const updated = await prisma.operation.update({
    where: { id },
    data: {
      devise: devise ?? o.devise,
      montantCents: montant != null ? cents(montant) : o.montantCents,
      dateValeur: nextDate,
      payeur: payeur ?? o.payeur,
      motif: motif ?? o.motif,
      benef: benef ?? o.benef,
      objet: objet ?? o.objet,
      mode: mode ?? o.mode,
      edited: true,
      updatedAt: new Date()
    }
  })
  await prisma.history.create({
    data: { action: `UPDATE_${o.type}`, refId: id, devise: updated.devise, montantCents: updated.montantCents, motif: updated.motif ?? updated.objet, actorId: req.user.id, meta: { before: o, after: updated } }
  })
  res.json(updated)
})

// ---------- cancel (seulement SOUMIS, et par auteur/Admin)
app.post('/operations/:id/cancel', auth, async (req, res) => {
  const { id } = req.params
  const o = await prisma.operation.findUnique({ where: { id } })
  if (!o) return res.status(404).json({ error: 'Not found' })
  if (o.statut !== 'SOUMIS') return res.status(400).json({ error: 'Non annulable' })
  if (o.createdById !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Action réservée au créateur ou Admin' })
  }

  const updated = await prisma.operation.update({
    where: { id }, data: { statut: 'ANNULE', canceledAt: new Date() }
  })
  await prisma.history.create({
    data: { action: `CANCEL_${o.type}`, refId: id, devise: o.devise, montantCents: o.montantCents, motif: o.motif ?? o.objet, actorId: req.user.id }
  })
  res.json(updated)
})

// ---------- decision (APPROUVE / REJETE) par Manager
app.post('/operations/:id/decide', auth, async (req, res) => {
  if (req.user.role !== 'MANAGER' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Réservé au Manager/Admin' })
  }
  const { id } = req.params
  const { decision } = req.body
  const allowed = ['APPROUVE', 'REJETE']
  if (!allowed.includes(decision)) {
    return res.status(400).json({ error: 'decision invalide' })
  }
  try {
     const updated = await prisma.$transaction(async (tx) => {
       const o = await tx.operation.findUnique({ where: { id } })
       if (!o) throw new Error('Not found')
       if (o.statut !== 'SOUMIS') throw new Error('Déjà traitée / non éligible')
 
       // Garde-fou solde au moment de l’approbation d’un RETRAIT
       if (decision === 'APPROUVE' && o.type === 'RETRAIT') {
         const solde = await getSoldeCents(o.devise, tx)
         if (Number(o.montantCents) > solde) {
           // message clair avec devises/valeurs
           throw new Error(`Solde insuffisant en ${o.devise}. Disponible: ${money(solde)} ${o.devise}`)
         }
       }
       const up = await tx.operation.update({ where: { id }, data: { statut: decision } })
       await tx.history.create({
         data: { action: `DECIDE_${o.type}`, refId: id, devise: o.devise, montantCents: o.montantCents, motif: o.motif ?? o.objet, actorId: req.user.id, meta: { statut: decision } }
       })
       return up
     })
     res.json(updated)
   } catch (e) {
     const msg = e?.message || 'Erreur décision'
     const code = /Solde insuffisant/.test(msg) ? 400 : 400
     res.status(code).json({ error: msg })
  }
})

// ---------- listes (legacy pour les écrans existants)
app.get('/operations', auth, async (req, res) => {
  const { statut, type } = req.query
  const ops = await prisma.operation.findMany({
    where: { statut: statut ?? undefined, type: type ?? undefined },
    orderBy: { createdAt: 'desc' }
  })
  res.json(ops.map(o => ({
    ...o,
    date: o.dateValeur.toISOString().slice(0, 10), // alias pour le front
    montant: Number(o.montantCents) / 100
  })))
})

// ---------- recherche paginée + filtres avancés (pour Dashboard Manager)
app.get('/ops/search', auth, async (req, res) => {
  const {
    statut, type, devise, q,
    dateFrom, dateTo,
    min, max,         // montants en unités
    sortBy = 'createdAt', order = 'desc',
    page = '1', pageSize = '20',
    createdBy, createdById
  } = req.query
  // createdBy: 'me' ou createdById: <uuid>
  const creator =
    createdBy === 'me' ? req.user.id :
    (createdById ? String(createdById) : null)

  const where = {
    ...(statut ? { statut } : {}),
    ...(type ? { type } : {}),
    ...(devise ? { devise } : {}),
    ...(creator ? { createdById: creator } : {}),
    ...(dateFrom ? { dateValeur: { gte: new Date(dateFrom) } } : {}),
    ...(dateTo   ? { dateValeur: { lte: new Date(dateTo) } } : {}),
    ...(min != null || max != null ? {
      montantCents: {
        ...(min != null ? { gte: Math.round(Number(min)*100) } : {}),
        ...(max != null ? { lte: Math.round(Number(max)*100) } : {})
      }
    } : {}),
    ...(q ? {
      OR: [
        { reference: { contains: q, mode: 'insensitive' } },
        { payeur:    { contains: q, mode: 'insensitive' } },
        { motif:     { contains: q, mode: 'insensitive' } },
        { benef:     { contains: q, mode: 'insensitive' } },
        { objet:     { contains: q, mode: 'insensitive' } }
      ]
    } : {})
  }

  const take = Math.min(Math.max(parseInt(pageSize,10) || 20, 1), 200)
  const skip = (Math.max(parseInt(page,10) || 1, 1) - 1) * take

  const [total, items] = await Promise.all([
    prisma.operation.count({ where }),
    prisma.operation.findMany({
      where,
      orderBy: { [sortBy]: order.toLowerCase() === 'asc' ? 'asc' : 'desc' },
      skip, take
    })
  ])

  res.json({
    total, page: Number(page), pageSize: take,
    items: items.map(o => ({
      ...o,
      date: o.dateValeur.toISOString().slice(0,10),
      montant: Number(o.montantCents)/100
    }))
  })
})



// ---------- history (protégé)
app.get('/history', auth, async (_req, res) => {
  const rows = await prisma.history.findMany({
    orderBy: { ts: 'desc' },
    take: 500,
    include: { actor: true }
  })
  res.json(rows.map(h => ({
    id: h.id,
    ts: h.ts,
    actor: h.actor?.email || h.actorId,
    action: h.action,
    ref: h.refId,
    devise: h.devise,
    montant: h.montantCents != null ? money(h.montantCents) : null,
    motif: h.motif,
    meta: h.meta
  })))
})
 // /history/search?kind=VERSEMENT|RETRAIT (ou vide pour tous) &page=1&pageSize=20
 app.get('/history/search', auth, async (req, res) => {
  const { kind = '', page = '1', pageSize = '20', q = '' } = req.query
  const where = {
    ...(kind === 'VERSEMENT' ? { action: { contains: 'VERSEMENT' } } : {}),
    ...(kind === 'RETRAIT'   ? { action: { contains: 'RETRAIT'   } } : {}),
    ...(q ? {
      OR: [
        // motif stocké directement sur History
        { motif: { contains: q, mode: 'insensitive' } },
        // champs de l'opération liée (réf lisible, payeur, bénéficiaire, motif/objet)
        { ref: { is: { reference: { contains: q, mode: 'insensitive' } } } },
        { ref: { is: { payeur:    { contains: q, mode: 'insensitive' } } } },
        { ref: { is: { benef:     { contains: q, mode: 'insensitive' } } } },
        { ref: { is: { motif:     { contains: q, mode: 'insensitive' } } } },
        { ref: { is: { objet:     { contains: q, mode: 'insensitive' } } } }
      ]
    } : {})
  }
   const take = Math.min(Math.max(parseInt(pageSize,10) || 20, 1), 200)
   const skip = (Math.max(parseInt(page,10) || 1, 1) - 1) * take
   const [total, rows] = await Promise.all([
   prisma.history.count({ where }),
    prisma.history.findMany({
      where,
      orderBy: { ts: 'desc' },
      skip, take,
      include: { actor: true, ref: true } // <-- on récupère l'Operation liée
    }),  
   ])
   const money = c => Number(c) / 100
   res.json({
     total, page: Number(page), pageSize: take,
     items: rows.map(h => ({
       id: h.id,
       ts: h.ts,
       actor: h.actor?.email || h.actorId,
       action: h.action,
       // Affiche la référence lisible si présente, sinon l'UUID
       ref: h.ref?.reference || h.refId,
       devise: h.devise,
       montant: h.montantCents != null ? money(h.montantCents) : null,
       motif: h.motif,
       meta: h.meta
     }))
   })
 })

// ---------- KPI 
// Résumé: Today / MTD / YTD + Δ vs hier + % électroniques MTD
app.get('/kpi/summary', auth, async (_req, res) => {
const now = new Date()
const todayStart = startOfDay(now), todayEnd = endOfDay(now)
const mStart = startOfMonth(now), yStart = startOfYear(now)
const ystStart = startOfDay(addDays(now, -1)), ystEnd = endOfDay(addDays(now, -1))


const today = await sumBy({ dateValeur: { gte: todayStart, lte: todayEnd } })
const mtd = await sumBy({ dateValeur: { gte: mStart, lte: todayEnd } })
const ytd = await sumBy({ dateValeur: { gte: yStart, lte: todayEnd } })
const yest = await sumBy({ dateValeur: { gte: ystStart, lte: ystEnd } })


// % paiements électroniques (modes considérés comme électroniques)
const electronicModes = ['Virement','Mobile Money','RTGS','Carte']
const mRows = await prisma.operation.findMany({
where: { statut: 'APPROUVE', type: 'VERSEMENT', dateValeur: { gte: mStart, lte: todayEnd } },
select: { mode: true, montantCents: true }
})
const totalM = mRows.reduce((a, r) => a + (r.montantCents || 0), 0)
const electronic = mRows.filter(r => electronicModes.includes(r.mode || '')).reduce((a, r) => a + (r.montantCents || 0), 0)
const pctElectronic = totalM ? Math.round((electronic / totalM) * 1000) / 10 : 0


res.json({
today,
mtd,
ytd,
deltaVsYesterday: {
in: Math.round((today.inSum - yest.inSum) * 100) / 100,
out: Math.round((today.outSum - yest.outSum) * 100) / 100,
solde: Math.round((today.solde - yest.solde) * 100) / 100
},
pctElectronicMTD: pctElectronic
})
})


// Série quotidienne (N derniers jours): in/out/net + cumul
app.get('/kpi/daily', auth, async (req, res) => {
const days = Math.min(365, Math.max(1, Number(req.query.days || 90)))
const end = endOfDay(new Date())
const start = startOfDay(addDays(end, -days + 1))


const rows = await prisma.operation.findMany({
where: { statut: 'APPROUVE', dateValeur: { gte: start, lte: end } },
select: { dateValeur: true, type: true, montantCents: true },
orderBy: { dateValeur: 'asc' }
})


const map = new Map()
for (let i = 0; i < days; i++) {
const d = toISODate(addDays(start, i))
map.set(d, { date: d, in: 0, out: 0, net: 0 })
}
rows.forEach(r => {
const key = toISODate(r.dateValeur)
const b = map.get(key)
if (!b) return
if (r.type === 'VERSEMENT') b.in += money(r.montantCents || 0)
else b.out += money(r.montantCents || 0)
b.net = Math.round((b.in - b.out) * 100) / 100
})
let cum = 0
const series = Array.from(map.values()).map(b => { cum += b.net; return { ...b, cum: Math.round(cum * 100) / 100 } })
res.json(series)
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`))
