import { defineStore } from 'pinia'
import { api } from '../lib/api'
import { useAuthStore } from './authStore'

export const useCashStore = defineStore('cash', {
  state: () => ({
    versements: [],   // objets API (avec montantCents)
    retraits:   [],   // objets API (avec montantCents)
    history:    [],   // /history (montant en unités)
    kpis:       { inSum: 0, outSum: 0, solde: 0 },
    kpisByDev:  {},   // { CDF: {inSum,outSum,solde}, USD: {...} }

    // --- KPI Manager (nouveau) ---
    kpiSummary:   null, // { today, mtd, ytd, deltaVsYesterday, pctElectronicMTD }
    kpiDaily:     [],   // [{date,in,out,net,cum}, ...] sur 90j
    kpiWaterfall: null, // { month, opening, in, out, closing }
    kpiModesMtd:  []    // [{ mode, amount, pct }, ...]
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
       // On se base sur /kpi/summary (déjà présent côté backend)
       const summary = await api.get('/kpi/summary')
       // Photo globale : on prend le YTD pour alimenter les cartes du haut
       this.kpis = summary?.ytd || { inSum: 0, outSum: 0, solde: 0 }
 
       // Totaux par devise (calculés côté client via /ops/search paginé)
       this.kpisByDev = {}
       for (const dev of ['CDF','USD']) {
         const agg = await this._sumApprovedByDevise(dev)
         if (agg.inSum || agg.outSum) this.kpisByDev[dev] = agg
       }
     },
 
     async _sumApprovedByDevise(devise){
       let page = 1, pageSize = 200, inSum = 0, outSum = 0, total = 0
       while (true) {
         const params = new URLSearchParams({
           statut: 'APPROUVE', devise, page: String(page), pageSize: String(pageSize)
         })
         const data = await api.get('/ops/search?' + params.toString())
        total = data.total
        for (const o of data.items) {
          if (o.type === 'VERSEMENT') inSum += Number(o.montant)
          else if (o.type === 'RETRAIT') outSum += Number(o.montant)
        }
        if (page * pageSize >= total) break
        page++
      }
      const solde = Math.round((inSum - outSum) * 100) / 100
      return { inSum, outSum, solde }
    },

    // ------- KPI Manager (nouveau)
    async loadManagerKpis(){
      const [summary, daily] = await Promise.all([
        api.get('/kpi/summary'),
        api.get('/kpi/daily?days=90')
      ])
      this.kpiSummary   = summary
      this.kpiDaily     = daily
      this.kpiWaterfall = this._computeWaterfallFromDaily(daily) // estimation côté client
      this.kpiModesMtd  = [] // section allégée tant qu'il n'y a pas d'endpoint dédié
    },

    _computeWaterfallFromDaily(daily){
      if (!Array.isArray(daily) || !daily.length) return null
      const now = new Date()
      const month = now.toISOString().slice(0,7) // YYYY-MM
      const monthStart = month + '-01'
      const i0 = daily.findIndex(d => d.date >= monthStart)
      const opening = i0 > 0 && daily[i0-1]?.cum != null ? Number(daily[i0-1].cum) : 0
      const inSum  = daily.slice(Math.max(i0,0)).reduce((a,b)=>a+(b.in||0), 0)
      const outSum = daily.slice(Math.max(i0,0)).reduce((a,b)=>a+(b.out||0), 0)
      const closing = Math.round((opening + inSum - outSum) * 100) / 100
      return {
        month,
        opening: Math.round(opening * 100) / 100,
        in: Math.round(inSum * 100) / 100,
        out: Math.round(outSum * 100) / 100,
        closing
      }
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
      await Promise.all([this.loadOperations(), this.loadHistory(), this.loadKpis(), this.loadManagerKpis()])
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
      await Promise.all([this.loadOperations(), this.loadHistory(), this.loadKpis(), this.loadManagerKpis()])
      return o
    },
    async updateVersement(id, { montantCents, devise, motif, payeur, mode, date }){
      const body = {
        devise,
        montant: Number(montantCents)/100,
        date, payeur, motif, mode
      }
      const o = await api.patch(`/operations/${id}`, body)
      await Promise.all([this.loadOperations(), this.loadHistory(), this.loadKpis(), this.loadManagerKpis()])
      return o
    },
    async updateRetrait(id, { montantCents, devise, objet, benef, mode, date }){
      const body = {
        devise,
        montant: Number(montantCents)/100,
        date, benef, objet, mode
      }
      const o = await api.patch(`/operations/${id}`, body)
      await Promise.all([this.loadOperations(), this.loadHistory(), this.loadKpis(), this.loadManagerKpis()])
      return o
    },
    async cancelVersement(id){
      await api.post(`/operations/${id}/cancel`, {})
      await Promise.all([this.loadOperations(), this.loadHistory(), this.loadKpis(), this.loadManagerKpis()])
    },
    async decide(items, decision){
      // le backend crée l’historique entrée par entrée
      for (const sel of items){
        await api.post(`/operations/${sel.id}/decide`, { decision })
      }
      await Promise.all([this.loadOperations(), this.loadHistory(), this.loadKpis(), this.loadManagerKpis()])
    }
  }
})
