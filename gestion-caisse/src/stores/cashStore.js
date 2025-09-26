import { defineStore } from 'pinia'
import { useAuthStore } from './authStore'

const KEY = 'gcaisse-vite-v2' 

const load = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    // migration depuis v1
    if (v && !v.history) v.history = []
    return v || { versements: [], retraits: [], history: [] }
  } catch {
    return { versements: [], retraits: [], history: [] }
  }
}
const save = (d) => localStorage.setItem(KEY, JSON.stringify(d))

export const useCashStore = defineStore('cash', {
  state: () => ({ data: load() }),
  getters: {
    versements: (s) => s.data.versements,
    retraits: (s) => s.data.retraits,
    pending: (s) => [
      ...s.data.versements.filter(v=>v.statut==='SOUMIS').map(v=>({type:'VERSEMENT', ...v})),
      ...s.data.retraits.filter(r=>r.statut==='SOUMIS').map(r=>({type:'RETRAIT', ...r})),
    ],
    totals: (s) => {
      const inSum = s.data.versements.filter(v=>v.statut==='APPROUVE').reduce((a,b)=>a+b.montant,0)
      const outSum = s.data.retraits.filter(r=>r.statut==='APPROUVE').reduce((a,b)=>a+b.montant,0)
      return { inSum, outSum, solde: inSum - outSum }
    },
    //totaux par devise (pour Manager)
    totalsByCurrency: (s) => {
      const map = {}
      const add = (dev, val) => { map[dev] = map[dev] || { inSum:0, outSum:0, solde:0 }; val>0 ? (map[dev].inSum+=val) : (map[dev].outSum+=-val) }
      s.data.versements.filter(v=>v.statut==='APPROUVE').forEach(v=>add(v.devise, +v.montant))
      s.data.retraits  .filter(r=>r.statut==='APPROUVE').forEach(r=>add(r.devise, -r.montant))
      Object.keys(map).forEach(k => map[k].solde = map[k].inSum - map[k].outSum)
      return map
    },
    // historique (le plus récent d’abord)
    history: (s) => [...s.data.history].reverse(),
  },
  actions: {
    fmt(n){ return new Intl.NumberFormat('fr-FR').format(n) },
    today(){ return new Date().toISOString().slice(0,10) },
    now(){ return new Date().toISOString() }, // NEW
    uid(p){ return p+'-'+Math.random().toString(36).slice(2,8) },

    // journal immuable
    pushHistory(entry){
      const auth = useAuthStore()
      this.data.history.push({
        id: this.uid('H'),
        ts: this.now(),
        actor: auth.current?.email || 'system',
        ...entry
      })
      save(this.data)
    },

    addVersement(v){
      this.data.versements.unshift(v); save(this.data)
      this.pushHistory({ action:'ADD_VERSEMENT', ref:v.id, devise:v.devise, montant:v.montant,motif: v.motif, meta:{ payeur:v.payeur, motif:v.motif } })
    },
    addRetrait(r){
      this.data.retraits.unshift(r); save(this.data)
      this.pushHistory({ action:'ADD_RETRAIT', ref:r.id, devise:r.devise, montant:r.montant, motif: r.objet, meta:{ benef:r.benef, objet:r.objet } }) 
    },

    // édition (Comptable), uniquement si SOUMIS
    updateRetrait(id, patch){
      const r = this.data.retraits.find(x=>x.id===id)
      if(!r) throw new Error('Retrait introuvable')
      if(r.statut!=='SOUMIS') throw new Error('Impossible de modifier: pas au statut SOUMIS')
      const before = {...r}
      Object.assign(r, patch)
      save(this.data)
      this.pushHistory({ action:'UPDATE_RETRAIT', ref:id, devise:r.devise, montant:r.montant, motif: r.objet, meta:{ before, after:{...r} } })
    },

  cancelVersement(id){
  const v = this.data.versements.find(x => x.id === id)
  if(!v) throw new Error('Versement introuvable')
  if(v.statut !== 'SOUMIS') throw new Error('Impossible d’annuler: pas au statut SOUMIS')

  v.statut = 'ANNULE'               
  v.canceledAt = this.now()         

  save(this.data)
  this.pushHistory({
    action: 'CANCEL_VERSEMENT',
    ref: id,
    devise: v.devise,
    montant: v.montant,
    motif: v.motif,
  })
},

updateVersement(id, patch){
  const v = this.data.versements.find(x => x.id === id)
  if(!v) throw new Error('Versement introuvable')
  if(v.statut !== 'SOUMIS') throw new Error('Impossible de modifier: pas au statut SOUMIS')

  const before = { ...v }
  Object.assign(v, patch)
  v.edited = true                   
  v.updatedAt = this.now()          

  save(this.data)
  this.pushHistory({
    action: 'UPDATE_VERSEMENT',
    ref: id,
    devise: v.devise,
    montant: v.montant,
    motif: v.motif,
    meta: { before, after: { ...v } }
  })
},


    decide(items, decision){
      items.forEach(sel=>{
        if(sel.type==='VERSEMENT'){
          const v=this.data.versements.find(x=>x.id===sel.id); if(v) { v.statut=decision; this.pushHistory({ action:`DECIDE_${sel.type}`, ref:v.id, devise:v.devise, montant:v.montant, motif: v.motif,meta:{ statut:decision } }) }
        } else {
          const r=this.data.retraits.find(x=>x.id===sel.id); if(r) { r.statut=decision; this.pushHistory({ action:`DECIDE_${sel.type}`, ref:r.id, devise:r.devise, montant:r.montant,   motif: r.objet, meta:{ statut:decision } }) }
        }
      })
      save(this.data)
    },
  }
})
