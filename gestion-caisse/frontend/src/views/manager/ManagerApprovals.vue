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
  await Promise.all([loadV(), loadR()])
}

async function decide (decision) {
  const picked = [...selectedV.value, ...selectedR.value]
  if (!picked.length) { alert('Sélectionnez au moins un élément.'); return }
  try {
    // On retient combien on va potentiellement retirer de chaque liste
    const removedV = picked.filter(x => x.type === 'VERSEMENT').length
    const removedR = picked.filter(x => x.type === 'RETRAIT').length

    await store.decide(picked, decision) // recharge aussi les opérations/kpis côté store

    // Si la page devient vide après retrait des éléments, reculer d'une page
    const nextTotalV = Math.max(0, totalV.value - removedV)
    const nextTotalR = Math.max(0, totalR.value - removedR)
    if ((pageV.value - 1) * pageSizeV.value >= nextTotalV && pageV.value > 1) pageV.value--
    if ((pageR.value - 1) * pageSizeR.value >= nextTotalR && pageR.value > 1) pageR.value--

    await reloadAll()
  } catch (e) {
    alert(e?.message || 'Erreur lors de la décision')
  }
}

onMounted(reloadAll)
</script>
