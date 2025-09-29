import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
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
const money = c => Math.round(c) / 100

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
  } catch (e) {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Réservé à l’Admin' })
  next()
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
  if (!u.approved) {
    // on permet le login mais l'app front redirige vers /pending
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
 
 app.post('/admin/users/:id/role', auth, adminOnly, async (req, res) => {
   const { id } = req.params
   const { role } = req.body || {}
   const allowed = ['PERCEPTEUR', 'COMPTABLE', 'MANAGER', 'ADMIN']
   if (!allowed.includes(role)) return res.status(400).json({ error: 'Rôle invalide' })
   const u = await prisma.appUser.update({ where: { id }, data: { role } })
   await prisma.adminAudit.create({ data: { actorId: req.user.id, action: 'SET_ROLE', payload: { userId: id, role } } })
   res.json({ ok: true, user: { id: u.id, role: u.role } })
 })
 
 app.delete('/admin/users/:id', auth, adminOnly, async (req, res) => {
   const { id } = req.params
   if (id === req.user.id) return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' })
   await prisma.appUser.delete({ where: { id } })
   await prisma.adminAudit.create({ data: { actorId: req.user.id, action: 'DELETE_USER', payload: { userId: id } } })
   res.json({ ok: true })
 })
 

// ---------- créer opération
app.post('/operations', auth, async (req, res) => {
  try {
    const { type, devise, montant, date, payeur, motif, benef, objet, mode, createdById } = req.body
    if (!req.user.approved) return res.status(403).json({ error: 'Compte non approuvé' })
    if (createdById && createdById !== req.user.id) return res.status(403).json({ error: 'Actor mismatch' })
    const o = await prisma.operation.create({
      data: {
        type, devise, montantCents: cents(montant), dateValeur: new Date(date),
        payeur, motif, benef, objet, mode, createdById: req.user.id
      }
    })
    await prisma.history.create({
      data: { action: `ADD_${type}`, refId: o.id, devise: o.devise, montantCents: o.montantCents, motif: motif ?? objet, actorId: req.user.id }
    })
    res.json(o)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ---------- éditer (seulement SOUMIS)
app.patch('/operations/:id', auth, async (req, res) => {
  const { id } = req.params
  const o = await prisma.operation.findUnique({ where: { id } })
  if (!o) return res.status(404).json({ error: 'Not found' })
  if (o.statut !== 'SOUMIS') return res.status(400).json({ error: 'Non modifiable' })

  const { devise, montant, date, payeur, motif, benef, objet, mode } = req.body
  const updated = await prisma.operation.update({
    where: { id },
    data: {
      devise: devise ?? o.devise,
      montantCents: montant != null ? cents(montant) : o.montantCents,
      dateValeur: date ? new Date(date) : o.dateValeur,
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

// ---------- cancel (seulement SOUMIS)
app.post('/operations/:id/cancel', auth, async (req, res) => {
  const { id } = req.params
  const o = await prisma.operation.findUnique({ where: { id } })
  if (!o) return res.status(404).json({ error: 'Not found' })
  if (o.statut !== 'SOUMIS') return res.status(400).json({ error: 'Non annulable' })

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
  const { decision } = req.body // 'APPROUVE' ou 'REJETE'
  const o = await prisma.operation.findUnique({ where: { id } })
  if (!o) return res.status(404).json({ error: 'Not found' })
  const updated = await prisma.operation.update({ where: { id }, data: { statut: decision } })
  await prisma.history.create({
    data: { action: `DECIDE_${o.type}`, refId: id, devise: o.devise, montantCents: o.montantCents, motif: o.motif ?? o.objet, actorId: req.user.id, meta: { statut: decision } }
  })
  res.json(updated)
})

// ---------- listes
app.get('/operations', auth, async (req, res) => {
  const { statut, type } = req.query
  const ops = await prisma.operation.findMany({
    where: { statut: statut ?? undefined, type: type ?? undefined },
    orderBy: { createdAt: 'desc' }
  })
  res.json(ops.map(o => ({ ...o, montant: money(o.montantCents) })))
})

app.get('/history', async (_req, res) => {
  const rows = await prisma.history.findMany({ orderBy: { ts: 'desc' }, take: 500 })
  res.json(rows.map(h => ({ ...h, montant: h.montantCents != null ? money(h.montantCents) : null })))
})

// ---------- KPI
app.get('/kpi/totals', auth, async (_req, res) => {
  const inSum = await prisma.operation.aggregate({ _sum: { montantCents: true }, where: { statut: 'APPROUVE', type: 'VERSEMENT' } })
  const outSum = await prisma.operation.aggregate({ _sum: { montantCents: true }, where: { statut: 'APPROUVE', type: 'RETRAIT' } })
  const i = inSum._sum.montantCents || 0, o = outSum._sum.montantCents || 0
  res.json({ inSum: money(i), outSum: money(o), solde: money(i - o) })
})

app.get('/kpi/totals-by-currency', auth, async (_req, res) => {
  const approved = await prisma.operation.groupBy({
    by: ['devise', 'type'],
    where: { statut: 'APPROUVE' },
    _sum: { montantCents: true }
  })
  const map = {}
  approved.forEach(r => {
    const dev = r.devise
    map[dev] = map[dev] || { inSum: 0, outSum: 0, solde: 0 }
    const val = (r._sum.montantCents || 0)
    if (r.type === 'VERSEMENT') map[dev].inSum += val
    else map[dev].outSum += val
    map[dev].solde = map[dev].inSum - map[dev].outSum
  })
  // cents -> money
  Object.keys(map).forEach(k => {
    map[k] = { inSum: money(map[k].inSum), outSum: money(map[k].outSum), solde: money(map[k].solde) }
  })
  res.json(map)
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`))
