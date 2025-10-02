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

    <!-- Actions -->
    <div class="card">
      <div style="display:flex;gap:8px">
        <button class="btn success" @click="decide('APPROUVE')">Approuver</button>
        <button class="btn danger"  @click="decide('REJETE')">Rejeter</button>
      </div>
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
import { ref, computed, onMounted } from 'vue'
import { useCashStore } from '../../stores/cashStore'

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

const versementsPending = computed(() => store.versements.filter(v => v.statut === 'SOUMIS'))
const retraitsPending   = computed(() => store.retraits.filter(r => r.statut === 'SOUMIS'))

onMounted(async () => {
  try {
    await Promise.all([store.loadOperations(), store.loadHistory(), store.loadKpis()])
  } catch (e) { console.error(e) }
})
</script>
