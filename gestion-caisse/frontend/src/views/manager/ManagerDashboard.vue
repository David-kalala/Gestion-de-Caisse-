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
const totalIn = computed(() => {
  if (!pieData.value?._raw) return 0
  return pieData.value._raw
    .filter(x => x.type === 'VERSEMENT')
    .reduce((a, b) => a + b.total, 0)
})
const totalOut = computed(() => {
  if (!pieData.value?._raw) return 0
  return pieData.value._raw
    .filter(x => x.type === 'RETRAIT')
    .reduce((a, b) => a + b.total, 0)
})

function groupBy(arr, k) {
  return arr.reduce((m, x) => ((m[x[k]] = (m[x[k]] || [])).push(x), m), {})
}

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
  // Camembert par devise/type
  const split = await api.get('/kpi/split-approved')
  const labels = ['Entrées (VERSEMENT)', 'Sorties (RETRAIT)']
  const groups = groupBy(split, 'devise')
  const datasets = Object.keys(groups).map(dev => {
    const sumIn  = groups[dev].filter(x => x.type === 'VERSEMENT').reduce((a, b) => a + b.total, 0)
    const sumOut = groups[dev].filter(x => x.type === 'RETRAIT').reduce((a, b) => a + b.total, 0)
    return { label: dev, data: [sumIn, sumOut] }
  })
  pieData.value = { labels, datasets }
  pieData.value._raw = split

  // Lignes journalières (120 jours)
  const daily = await api.get('/kpi/daily?days=120&devise=CDF,USD')
  const days = daily.map(x => x.date)
  const mk = (dev, key) => daily.map(x => x[dev]?.[key] ?? 0)
  lineData.value = {
    labels: days,
    datasets: [
      { label: 'CDF - Entrées', data: mk('CDF', 'in') },
      { label: 'CDF - Sorties', data: mk('CDF', 'out') },
      { label: 'USD - Entrées', data: mk('USD', 'in') },
      { label: 'USD - Sorties', data: mk('USD', 'out') }
    ]
  }

  // Top bénéficiaires
  topBenef.value = await api.get('/kpi/top-benef?limit=10')
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
