import { defineStore } from 'pinia'


const KEY = 'gcaisse-vite-v1'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { versements: [], retraits: [] } } catch { return { versements: [], retraits: [] } } }
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
},
actions: {
fmt(n){ return new Intl.NumberFormat('fr-FR').format(n) },
today(){ return new Date().toISOString().slice(0,10) },
uid(p){ return p+'-'+Math.random().toString(36).slice(2,8) },
addVersement(v){ this.data.versements.unshift(v); save(this.data) },
addRetrait(r){ this.data.retraits.unshift(r); save(this.data) },
decide(items, decision){
items.forEach(sel=>{
if(sel.type==='VERSEMENT'){
const v=this.data.versements.find(x=>x.id===sel.id); if(v) v.statut=decision
} else {
const r=this.data.retraits.find(x=>x.id===sel.id); if(r) r.statut=decision
}
})
save(this.data)
},
}
})