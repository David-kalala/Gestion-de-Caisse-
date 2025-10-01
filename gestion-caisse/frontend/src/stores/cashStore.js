 import { defineStore } from 'pinia'
 import { api } from '../lib/api'
 import { useAuthStore } from './authStore'
 
 export const useCashStore = defineStore('cash', {
   state: () => ({
     versements: [],   // objets API (avec montantCents)
     retraits:   [],   // objets API (avec montantCents)
     history:    [],   // /history (montant en unités)
     kpis:       { inSum: 0, outSum: 0, solde: 0 },
     kpisByDev:  {}    // { CDF: {inSum,outSum,solde}, USD: {...} }
   }),
   getters: {
     pending: (s) => [
       ...s.versements.filter(v => v.statut === 'SOUMIS').map(v => ({ type: 'VERSEMENT', ...v })),
       ...s.retraits  .filter(r => r.statut === 'SOUMIS').map(r => ({ type: 'RETRAIT', ...r })),
     ]
   },
   actions: {
     // ------- helpers montants
     fmtCents(c){ return new Intl.NumberFormat('fr-FR').format((Number(c||0)/100)) },
     fmtUnit(n){ return new Intl.NumberFormat('fr-FR').format(Number(n||0)) },
     toCents(units){ return Math.round(Number(units) * 100) },
     today(){ return new Date().toISOString().slice(0,10) },
 
     // ------- chargements
     async loadOperations(){
       const [vIn, rIn] = await Promise.all([
         api.get('/operations?type=VERSEMENT'),
         api.get('/operations?type=RETRAIT')
       ])
       // l’API retourne {montantCents, montant} → on garde la source de vérité en CENTIMES côté front
       this.versements = vIn
       this.retraits   = rIn
     },
     async loadHistory(){ this.history = await api.get('/history') },
     async loadKpis(){
       this.kpis = await api.get('/kpi/totals')
       this.kpisByDev = await api.get('/kpi/totals-by-currency')
     },
 
     // ------- mutations via API
     async addVersement({ montantCents, devise, motif, payeur, mode, date }){
       const auth = useAuthStore()
       const body = {
         type: 'VERSEMENT',
         devise,
         montant: Number(montantCents)/100, // l’API attend "montant" en unités → on convertit
         date,
         payeur, motif, mode,
         createdById: auth.current?.id
       }
       const o = await api.post('/operations', body)
       await this.loadOperations(); await this.loadHistory(); await this.loadKpis()
       return o
     },
     async addRetrait({ montantCents, devise, objet, benef, mode, date }){
       const auth = useAuthStore()
       const body = {
         type: 'RETRAIT',
         devise,
         montant: Number(montantCents)/100,
         date,
         benef, objet, mode,
         createdById: auth.current?.id
       }
       const o = await api.post('/operations', body)
       await this.loadOperations(); await this.loadHistory(); await this.loadKpis()
       return o
     },
     async updateVersement(id, { montantCents, devise, motif, payeur, mode, date }){
       const body = {
         devise,
         montant: Number(montantCents)/100,
         date, payeur, motif, mode
       }
       const o = await api.patch(`/operations/${id}`, body)
       await this.loadOperations(); await this.loadHistory(); await this.loadKpis()
       return o
     },
     async updateRetrait(id, { montantCents, devise, objet, benef, mode, date }){
       const body = {
         devise,
         montant: Number(montantCents)/100,
         date, benef, objet, mode
       }
       const o = await api.patch(`/operations/${id}`, body)
       await this.loadOperations(); await this.loadHistory(); await this.loadKpis()
       return o
     },
     async cancelVersement(id){
       await api.post(`/operations/${id}/cancel`, {})
       await this.loadOperations(); await this.loadHistory(); await this.loadKpis()
     },
     async decide(items, decision){
       // le backend crée l’historique entrée par entrée
       for (const sel of items){
         await api.post(`/operations/${sel.id}/decide`, { decision })
       }
       await this.loadOperations(); await this.loadHistory(); await this.loadKpis()
     }
   }
 })