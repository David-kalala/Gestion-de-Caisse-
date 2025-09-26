import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { prisma } from './db.js'

dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())

// ---------- helpers
const cents = n => Math.round(Number(n) * 100)
const money = c => Math.round(c) / 100

// ---------- auth (DEMO: sans JWT, à sécuriser plus tard)
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body
  const u = await prisma.appUser.findUnique({ where: { email } })
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) {
    return res.status(401).json({ error: 'Identifiants invalides' })
  }
  res.json({ id: u.id, name: u.name, email: u.email, role: u.role, approved: u.approved })
})

// ---------- créer opération
app.post('/operations', async (req, res) => {
  try {
    const { type, devise, montant, date, payeur, motif, benef, objet, mode, createdById } = req.body
    const o = await prisma.operation.create({
      data: {
        type, devise, montantCents: cents(montant), dateValeur: new Date(date),
        payeur, motif, benef, objet, mode, createdById
      }
    })
    await prisma.history.create({
      data: { action: `ADD_${type}`, refId: o.id, devise: o.devise, montantCents: o.montantCents, motif: motif ?? objet, actorId: createdById }
    })
    res.json(o)
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ---------- éditer (seulement SOUMIS)
app.patch('/operations/:id', async (req, res) => {
  const { id } = req.params
  const o = await prisma.operation.findUnique({ where: { id } })
  if (!o) return res.status(404).json({ error: 'Not found' })
  if (o.statut !== 'SOUMIS') return res.status(400).json({ error: 'Non modifiable' })

  const { devise, montant, date, payeur, motif, benef, objet, mode, actorId } = req.body
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
    data: { action: `UPDATE_${o.type}`, refId: id, devise: updated.devise, montantCents: updated.montantCents, motif: updated.motif ?? updated.objet, actorId, meta: { before: o, after: updated } }
  })
  res.json(updated)
})

// ---------- cancel (seulement SOUMIS)
app.post('/operations/:id/cancel', async (req, res) => {
  const { id } = req.params
  const { actorId } = req.body
  const o = await prisma.operation.findUnique({ where: { id } })
  if (!o) return res.status(404).json({ error: 'Not found' })
  if (o.statut !== 'SOUMIS') return res.status(400).json({ error: 'Non annulable' })

  const updated = await prisma.operation.update({
    where: { id }, data: { statut: 'ANNULE', canceledAt: new Date() }
  })
  await prisma.history.create({
    data: { action: `CANCEL_${o.type}`, refId: id, devise: o.devise, montantCents: o.montantCents, motif: o.motif ?? o.objet, actorId }
  })
  res.json(updated)
})

// ---------- decision (APPROUVE / REJETE) par Manager
app.post('/operations/:id/decide', async (req, res) => {
  const { id } = req.params
  const { decision, actorId } = req.body // 'APPROUVE' ou 'REJETE'
  const o = await prisma.operation.findUnique({ where: { id } })
  if (!o) return res.status(404).json({ error: 'Not found' })
  const updated = await prisma.operation.update({ where: { id }, data: { statut: decision } })
  await prisma.history.create({
    data: { action: `DECIDE_${o.type}`, refId: id, devise: o.devise, montantCents: o.montantCents, motif: o.motif ?? o.objet, actorId, meta: { statut: decision } }
  })
  res.json(updated)
})

// ---------- listes
app.get('/operations', async (req, res) => {
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
app.get('/kpi/totals', async (_req, res) => {
  const inSum = await prisma.operation.aggregate({ _sum: { montantCents: true }, where: { statut: 'APPROUVE', type: 'VERSEMENT' } })
  const outSum = await prisma.operation.aggregate({ _sum: { montantCents: true }, where: { statut: 'APPROUVE', type: 'RETRAIT' } })
  const i = inSum._sum.montantCents || 0, o = outSum._sum.montantCents || 0
  res.json({ inSum: money(i), outSum: money(o), solde: money(i - o) })
})

app.get('/kpi/totals-by-currency', async (_req, res) => {
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
