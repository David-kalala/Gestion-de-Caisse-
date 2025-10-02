<template>
  <div class="grid">
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
              <tr v-for="x in itemsV" :key="x.id">
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
        <p class="muted" style="margin-top:8px">
          Page {{ pageV }} / {{ Math.max(1, Math.ceil(totalV/pageSizeV)) }}
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn secondary" :disabled="pageV<=1" @click="pageV--; loadV()">Précédent</button>
          <button class="btn secondary" :disabled="pageV>=Math.ceil(totalV/pageSizeV)" @click="pageV++; loadV()">Suivant</button>
          <label style="margin-left:auto">
            Taille page
            <select v-model.number="pageSizeV" @change="pageV=1; loadV()">
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
          </label>
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
              <tr v-for="x in itemsR" :key="x.id">
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
        <p class="muted" style="margin-top:8px">
          Page {{ pageR }} / {{ Math.max(1, Math.ceil(totalR/pageSizeR)) }}
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn secondary" :disabled="pageR<=1" @click="pageR--; loadR()">Précédent</button>
          <button class="btn secondary" :disabled="pageR>=Math.ceil(totalR/pageSizeR)" @click="pageR++; loadR()">Suivant</button>
          <label style="margin-left:auto">
            Taille page
            <select v-model.number="pageSizeR" @change="pageR=1; loadR()">
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
          </label>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="card">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn success" @click="decide('APPROUVE')">Approuver</button>
        <button class="btn danger"  @click="decide('REJETE')">Rejeter</button>
        <button class="btn secondary" @click="reloadAll()">Actualiser</button>
      </div>
    </div>

    <!-- Historique -->
    <div class="card">
      <h3>Historique des opérations</h3>
      <div class="table" v-if="store.history.length">
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
      <p v-else class="muted">—</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCashStore } from '../../stores/cashStore'
import { api } from '../../lib/api'

const store = useCashStore()

// Sélections
const selectedV = ref([])
const selectedR = ref([])

// Versements en attente (paginés)
const itemsV = ref([])
const totalV = ref(0)
const pageV = ref(1)
const pageSizeV = ref(10)

// Retraits en attente (paginés)
const itemsR = ref([])
const totalR = ref(0)
const pageR = ref(1)
const pageSizeR = ref(10)

async function loadV () {
  const params = new URLSearchParams({
    statut: 'SOUMIS',
    type: 'VERSEMENT',
    page: String(pageV.value),
    pageSize: String(pageSizeV.value)
  })
  const data = await api.get('/ops/search?' + params.toString())
  itemsV.value = data.items
  totalV.value = data.total
  selectedV.value = []
}

async function loadR () {
  const params = new URLSearchParams({
    statut: 'SOUMIS',
    type: 'RETRAIT',
    page: String(pageR.value),
    pageSize: String(pageSizeR.value)
  })
  const data = await api.get('/ops/search?' + params.toString())
  itemsR.value = data.items
  totalR.value = data.total
  selectedR.value = []
}

async function reloadAll () {
  await Promise.all([loadV(), loadR(), store.loadHistory()])
}

async function decide (decision) {
  const items = [...selectedV.value, ...selectedR.value]
  if (!items.length) { alert('Sélectionnez au moins un élément.'); return }
  try {
    await store.decide(items, decision)  // recharge aussi KPIs/History/Operations
    // Si la décision a vidé la page courante, on recule d'une page si besoin
    if ((pageV.value - 1) * pageSizeV.value >= Math.max(0, totalV.value - items.filter(x => x.type==='VERSEMENT').length)) {
      pageV.value = Math.max(1, pageV.value - 1)
    }
    if ((pageR.value - 1) * pageSizeR.value >= Math.max(0, totalR.value - items.filter(x => x.type==='RETRAIT').length)) {
      pageR.value = Math.max(1, pageR.value - 1)
    }
    await reloadAll()
  } catch (e) {
    alert(e?.message || 'Erreur lors de la décision')
  }
}

onMounted(reloadAll)
</script>
