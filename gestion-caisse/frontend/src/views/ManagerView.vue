<template>
  <div class="grid">

    <!-- KPIs haut de page -->
    <div class="card">
      <h2>Tableau de bord — Manager</h2>
      <div class="kpis" style="margin-top:10px">
        <div class="kpi">
          <div class="muted">Solde actuel (toutes devises)</div>
          <strong>{{ store.fmtUnit(store.kpis.solde) }}</strong>
          <div class="muted" style="font-size:12px">
            Entrées: {{ store.fmtUnit(store.kpis.inSum) }} · Sorties: {{ store.fmtUnit(store.kpis.outSum) }}
          </div>
        </div>
        <div class="kpi">
          <div class="muted">Δ vs Hier (solde)</div>
          <strong :style="{ color: (sum.deltaVsYesterday?.solde || 0) >= 0 ? '#16a34a' : '#dc2626' }">
            {{ signed(sum.deltaVsYesterday?.solde || 0) }}
          </strong>
          <div class="muted" style="font-size:12px">
            In: {{ signed(sum.deltaVsYesterday?.in || 0) }} · Out: {{ signed(sum.deltaVsYesterday?.out || 0) }}
          </div>
        </div>
        <div class="kpi">
          <div class="muted">Encaissements — Aujourd’hui</div>
          <strong>{{ store.fmtUnit(sum.today?.inSum || 0) }}</strong>
          <div class="muted" style="font-size:12px">
            Sorties: {{ store.fmtUnit(sum.today?.outSum || 0) }}
          </div>
        </div>
        <div class="kpi">
          <div class="muted">Encaissements — Mois (MTD)</div>
          <strong>{{ store.fmtUnit(sum.mtd?.inSum || 0) }}</strong>
          <div class="muted" style="font-size:12px">
            Sorties: {{ store.fmtUnit(sum.mtd?.outSum || 0) }}
          </div>
        </div>
        <div class="kpi">
          <div class="muted">Encaissements — Année (YTD)</div>
          <strong>{{ store.fmtUnit(sum.ytd?.inSum || 0) }}</strong>
          <div class="muted" style="font-size:12px">
            Sorties: {{ store.fmtUnit(sum.ytd?.outSum || 0) }}
          </div>
        </div>
        <div class="kpi">
          <div class="muted">Paiements électroniques (MTD)</div>
          <strong>{{ (sum.pctElectronicMTD || 0).toFixed(1) }}%</strong>
          <div class="muted" style="font-size:12px">
            Virement / Mobile Money / RTGS / Carte
          </div>
        </div>
      </div>
    </div>

    <!-- Courbe solde quotidien 90j -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <h3>Solde quotidien — 90 derniers jours (cumul)</h3>
        <small class="muted">Astuce: approuver/ajuster des opérations actualise la courbe</small>
      </div>
      <Sparkline :data="dailyCum" :height="80" />
    </div>

    <!-- Waterfall mois courant -->
    <div class="card">
      <h3>Variation du solde — {{ waterfall?.month || '—' }}</h3>
      <div class="kpis" style="margin-top:10px">
        <div class="kpi">
          <div class="muted">Ouverture</div>
          <strong>{{ store.fmtUnit(waterfall?.opening || 0) }}</strong>
        </div>
        <div class="kpi">
          <div class="muted">Entrées (MTD)</div>
          <strong>{{ store.fmtUnit(waterfall?.in || 0) }}</strong>
        </div>
        <div class="kpi">
          <div class="muted">Sorties (MTD)</div>
          <strong>{{ store.fmtUnit(waterfall?.out || 0) }}</strong>
        </div>
        <div class="kpi">
          <div class="muted">Clôture (estimée)</div>
          <strong>{{ store.fmtUnit(waterfall?.closing || 0) }}</strong>
        </div>
      </div>
    </div>

    <!-- Modes de paiement (MTD) -->
    <div class="card">
      <h3>Répartition des modes de paiement (MTD)</h3>
      <div class="table" v-if="store.kpiModesMtd.length">
        <table>
          <thead>
            <tr><th>Mode</th><th>Montant</th><th>Part</th></tr>
          </thead>
          <tbody>
            <tr v-for="m in store.kpiModesMtd" :key="m.mode">
              <td>{{ m.mode }}</td>
              <td>{{ store.fmtUnit(m.amount) }}</td>
              <td>{{ m.pct.toFixed(1) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="muted">Aucune donnée approuvée.</p>
    </div>

    <!-- Deux colonnes : Versements en attente / Retraits en attente -->
    <div class="grid grid-2">
      <!-- Versements -->
      <div class="card">
        <h2>Versements en attente</h2>
        <div class="table">
          <table>
            <thead>
              <tr>
                <th></th><th>#</th><th>Payeur — Motif</th>
                <th>Montant</th><th>Devise</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="x in versementsPending" :key="x.id">
                <td><input type="checkbox" v-model="selectedV" :value="{type:'VERSEMENT',id:x.id}"></td>
                <td>{{ x.reference || x.id }}</td>
                <td>{{ x.payeur }} — {{ x.motif }}</td>
                <td>{{ store.fmtCents(x.montantCents) }}</td>
                <td>{{ x.devise }}</td>
                <td>{{ x.date }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Retraits -->
      <div class="card">
        <h2>Retraits en attente</h2>
        <div class="table">
          <table>
            <thead>
              <tr>
                <th></th><th>#</th><th>Bénéficiaire — Objet</th>
                <th>Montant</th><th>Devise</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="x in retraitsPending" :key="x.id">
                <td><input type="checkbox" v-model="selectedR" :value="{type:'RETRAIT',id:x.id}"></td>
                <td>{{ x.reference || x.id }}</td>
                <td>{{ x.benef }} — {{ x.objet }}</td>
                <td>{{ store.fmtCents(x.montantCents) }}</td>
                <td>{{ x.devise }}</td>
                <td>{{ x.date }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Actions globales -->
    <div class="card">
      <div style="display:flex;gap:8px">
        <button class="btn success" @click="decide('APPROUVE')">Approuver</button>
        <button class="btn danger"  @click="decide('REJETE')">Rejeter</button>
      </div>
    </div>

    <!--  Solde par devise via sélecteur -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <h3>Solde par devise</h3>
        <div style="display:flex;align-items:center;gap:8px">
          <label>Devise</label>
          <select v-model="devise">
            <option v-for="d in currencies" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
      </div>

      <div v-if="totalsDev">
        <div class="kpis" style="margin-top:10px">
          <div class="kpi">
            <div class="muted">Entrées ({{ devise }})</div>
            <strong>{{ store.fmtUnit(totalsDev.inSum) }}</strong>
          </div>
          <div class="kpi">
            <div class="muted">Sorties ({{ devise }})</div>
            <strong>{{ store.fmtUnit(totalsDev.outSum) }}</strong>
          </div>
          <div class="kpi">
            <div class="muted">Solde ({{ devise }})</div>
            <strong>{{ store.fmtUnit(totalsDev.solde) }}</strong>
          </div>
        </div>
      </div>
      <p v-else class="muted" style="margin-top:8px">Aucune opération approuvée pour le moment.</p>
    </div>

    <!-- Historique -->
    <div class="card">
      <h3>Historique des opérations</h3>
      <div class="table">
        <table>
          <thead>
            <tr>
              <th>Date/Heure</th><th>Auteur</th><th>Action</th><th>Réf</th>
              <th>Montant</th><th>Devise</th><th>Motif</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in store.history" :key="h.id">
              <td>{{ new Date(h.ts).toLocaleString() }}</td>
              <td>{{ h.actor || '—' }}</td>
              <td>{{ h.action }}</td>
              <td>{{ h.ref }}</td>
              <td>{{ store.fmtUnit(h.montant) }}</td>
              <td>{{ h.devise }}</td>
              <td>{{ h.motif ?? h.meta?.motif ?? h.meta?.objet ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useCashStore } from '../stores/cashStore'
import Sparkline from '../components/Sparkline.vue'

const store = useCashStore()
const selectedV = ref([])
const selectedR = ref([])

function decide (decision) {
  const items = [...selectedV.value, ...selectedR.value]
  if (!items.length) { alert('Sélectionnez au moins un élément.'); return }
  store.decide(items, decision)
  selectedV.value = []
  selectedR.value = []
}

/** Listes en attente, séparées */
const versementsPending = computed(() => store.versements.filter(v => v.statut === 'SOUMIS'))
const retraitsPending   = computed(() => store.retraits.filter(r => r.statut === 'SOUMIS'))

/** KPI summary helpers */
const sum = computed(() => store.kpiSummary || { today:{}, mtd:{}, ytd:{}, deltaVsYesterday:{}, pctElectronicMTD:0 })
const signed = (n) => (n >= 0 ? `+${store.fmtUnit(n)}` : `-${store.fmtUnit(Math.abs(n))}`)

/** Série cumulée pour sparkline */
const dailyCum = computed(() => (store.kpiDaily || []).map(x => x.cum))

/** Liste des devises présentes dans les totaux (approuvés) */
const currencies = computed(() => Object.keys(store.kpisByDev || {}))

/** Devise sélectionnée (par défaut, la première dispo) */
const devise = ref(null)
watch(currencies, (list) => {
  if (list.length && !devise.value) devise.value = list[0]
}, { immediate: true })

/** Totaux de la devise sélectionnée */
const totalsDev = computed(() => devise.value ? store.kpisByDev[devise.value] : null)

const waterfall = computed(() => store.kpiWaterfall || null)

onMounted(async () => {
  try {
    await Promise.all([
      store.loadOperations(),
      store.loadHistory(),
      store.loadKpis(),
      store.loadManagerKpis() // charge summary, daily, waterfall, modes
    ])
  } catch (e) { console.error(e) }
})
</script>
