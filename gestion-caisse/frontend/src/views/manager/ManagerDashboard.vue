<template>
  <div class="grid">
    <!-- Filtres -->
    <div class="card">
      <h2>Dashboard Manager</h2>
      <div class="row">
        <div>
          <label>Recherche</label>
          <input v-model="q" placeholder="réf / motif / payeur / bénéficiaire">
        </div>
        <div>
          <label>Type</label>
          <select v-model="type">
            <option value="">(Tous)</option>
            <option>VERSEMENT</option>
            <option>RETRAIT</option>
          </select>
        </div>
      </div>
      <div class="row">
        <div>
          <label>Statut</label>
          <select v-model="statut">
            <option value="">(Tous)</option>
            <option>SOUMIS</option>
            <option>APPROUVE</option>
            <option>REJETE</option>
            <option>ANNULE</option>
          </select>
        </div>
        <div>
          <label>Devise</label>
          <select v-model="devise">
            <option value="">(Toutes)</option>
            <option>CDF</option>
            <option>USD</option>
          </select>
        </div>
      </div>
      <div class="row">
        <div><label>Du</label><input type="date" v-model="dateFrom"></div>
        <div><label>Au</label><input type="date" v-model="dateTo"></div>
      </div>
      <div class="row">
        <div><label>Montant min</label><input type="number" v-model.number="min"></div>
        <div><label>Montant max</label><input type="number" v-model.number="max"></div>
      </div>
      <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap">
        <button class="btn" @click="loadAll">Appliquer</button>
        <button class="btn secondary" @click="reset">Réinitialiser</button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="card">
      <div class="kpis">
        <div class="kpi">
          <div class="muted">Entrées approuvées</div>
          <strong>{{ fmt(totalIn) }}</strong>
        </div>
        <div class="kpi">
          <div class="muted">Sorties approuvées</div>
          <strong>{{ fmt(totalOut) }}</strong>
        </div>
        <div class="kpi">
          <div class="muted">Solde approuvé</div>
          <strong>{{ fmt(totalIn - totalOut) }}</strong>
        </div>
      </div>
    </div>

    <!-- Graphes -->
    <div class="grid grid-2">
      <div class="card">
        <h3>Répartition approuvée (camembert)</h3>
        <Doughnut v-if="pieData" :data="pieData" :options="pieOpts" />
        <p v-else class="muted">Chargement…</p>
      </div>
      <div class="card">
        <h3>Évolution journalière (lignes)</h3>
        <div style="height:300px">
          <Line v-if="lineData" :data="lineData" :options="lineOpts" />
          <p v-else class="muted">Chargement…</p>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Top bénéficiaires (sorties approuvées)</h3>
      <div class="table" v-if="topBenef.length">
        <table>
          <thead>
            <tr><th>Bénéficiaire</th><th>Devise</th><th>Total</th></tr>
          </thead>
          <tbody>
            <tr v-for="b in topBenef" :key="b.name + b.devise">
              <td>{{ b.name }}</td>
              <td>{{ b.devise }}</td>
              <td>{{ fmt(b.total) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="muted">—</p>
    </div>

    <!-- Tableau paginé (filtres appliqués) -->
    <div class="card">
      <h3>Résultats (aperçu)</h3>
      <div class="table">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Date</th><th>Type</th><th>Motif/Objet</th>
              <th>Payeur/Bénéf</th><th>Montant</th><th>Devise</th><th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in items" :key="o.id">
              <td>{{ o.reference || o.id }}</td>
              <td>{{ o.date }}</td>
              <td>{{ o.type }}</td>
              <td>{{ o.motif || o.objet }}</td>
              <td>{{ o.payeur || o.benef }}</td>
              <td>{{ fmt(o.montant) }}</td>
              <td>{{ o.devise }}</td>
              <td><span class="badge" :class="o.statut">{{ o.statut }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="muted" style="margin-top:8px">
        Page {{ page }} / {{ Math.max(1, Math.ceil(total/pageSize)) }}
      </p>
      <div style="display:flex;gap:8px">
        <button class="btn secondary" :disabled="page<=1" @click="page--; loadList()">Précédent</button>
        <button class="btn secondary" :disabled="page>=Math.ceil(total/pageSize)" @click="page++; loadList()">Suivant</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Line, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend,
  LineElement, PointElement, ArcElement,
  CategoryScale, LinearScale
} from 'chart.js'
import { api } from '../../lib/api' // chemin depuis /views/manager
import { useDebouncedWatch } from '../../lib/useDebouncedWatch'

ChartJS.register(
  Title, Tooltip, Legend,
  LineElement, PointElement, ArcElement,
  CategoryScale, LinearScale
)

// Filtres
const q = ref(''), type = ref(''), statut = ref(''), devise = ref('')
const dateFrom = ref(''), dateTo = ref('')
const min = ref(null), max = ref(null)

// Données liste paginée
const items = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// Données graphiques
const pieData = ref(null)
const lineData = ref(null)
const topBenef = ref([])

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Number(n || 0))

// Totaux depuis la répartition approuvée
const totalIn = computed(() =>
  (pieData.value?.datasets || []).reduce((a, ds) => a + (ds.data?.[0] || 0), 0)
)
const totalOut = computed(() =>
  (pieData.value?.datasets || []).reduce((a, ds) => a + (ds.data?.[1] || 0), 0)
)

async function loadList () {
  const params = new URLSearchParams()
  if (q.value) params.set('q', q.value)
  if (type.value) params.set('type', type.value)
  if (statut.value) params.set('statut', statut.value)
  if (devise.value) params.set('devise', devise.value)
  if (dateFrom.value) params.set('dateFrom', dateFrom.value)
  if (dateTo.value) params.set('dateTo', dateTo.value)
  if (min.value != null) params.set('min', String(min.value))
  if (max.value != null) params.set('max', String(max.value))
  params.set('page', String(page.value))
  params.set('pageSize', String(pageSize.value))

  //  endpoint paginé dédié
  const data = await api.get('/ops/search?' + params.toString())
  items.value = data.items
  total.value = data.total
}

async function loadKpis () {
  // 1) Lignes journalières (120 jours) — backend existant
  const daily = await api.get('/kpi/daily?days=120')
  const days = daily.map(x => x.date)
  lineData.value = {
    labels: days,
    datasets: [
      { label: 'Entrées (toutes devises)', data: daily.map(x => x.in  || 0) },
      { label: 'Sorties (toutes devises)', data: daily.map(x => x.out || 0) },
    ]
  }

  // 2) Répartition approvée (camembert) & 3) Top bénéficiaires — via /ops/search paginé
  const allApproved = await fetchAllApproved({})
  const byDev = {}
  for (const o of allApproved) {
    const dev = o.devise
    if (!byDev[dev]) byDev[dev] = { in: 0, out: 0 }
    if (o.type === 'VERSEMENT') byDev[dev].in  += Number(o.montant)
    else                        byDev[dev].out += Number(o.montant)
  }
  const labels = ['Entrées (VERSEMENT)', 'Sorties (RETRAIT)']
  const datasets = Object.keys(byDev).map(dev => ({ label: dev, data: [byDev[dev].in, byDev[dev].out] }))
  pieData.value = { labels, datasets }

  // Top bénéficiaires (RETRAIT approuvés)
  const approvedOut = await fetchAllApproved({ type: 'RETRAIT' })
  const map = new Map()
  for (const r of approvedOut) {
    const key = `${r.benef || '—'}|${r.devise}`
    map.set(key, (map.get(key) || 0) + Number(r.montant))
  }
  topBenef.value = Array.from(map.entries())
    .map(([k, total]) => {
      const [name, devise] = k.split('|')
      return { name, devise, total }
    })
    .sort((a,b)=>b.total-a.total)
   .slice(0, 10)
}

async function fetchAllApproved(extra){
  // Applique les filtres écran + statut=APPROUVE ; récupère toutes les pages
  const items = []
  let page = 1, pageSize = 200, total = 0
  while (true) {
    const params = new URLSearchParams()
    if (q.value) params.set('q', q.value)
    if (type.value || extra.type) params.set('type', extra.type || type.value)
    params.set('statut', 'APPROUVE')
    if (devise.value) params.set('devise', devise.value)
    if (dateFrom.value) params.set('dateFrom', dateFrom.value)
    if (dateTo.value) params.set('dateTo', dateTo.value)
    if (min.value != null) params.set('min', String(min.value))
    if (max.value != null) params.set('max', String(max.value))
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))
    const data = await api.get('/ops/search?' + params.toString())
    items.push(...data.items)
    total = data.total
    if (page * pageSize >= total) break
    page++
  }
  return items
}

function reset () {
  q.value = ''; type.value = ''; statut.value = ''; devise.value = ''
  dateFrom.value = ''; dateTo.value = ''; min.value = null; max.value = null
  page.value = 1
  loadAll()
}

async function loadAll () {
  await Promise.all([loadList(), loadKpis()])
}

const pieOpts = { plugins: { legend: { position: 'bottom' } } }
const lineOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }

onMounted(loadAll)
// Recherche debounced sur q
useDebouncedWatch(q, () => { page.value = 1; loadList() }, 300)
</script>

<style scoped>
/* On réutilise le thème global. */
</style>
