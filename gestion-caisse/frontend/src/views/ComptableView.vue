<template>
  <div class="grid grid-2">
    <!-- Formulaire -->
    <div class="card">
      <h2>Effectuer un retrait</h2>
      <form @submit.prevent="submit">
        <div class="row">
          <div><label>Montant</label><input type="number" v-model.number="form.montant" min="0" required></div>
          <div><label>Devise</label><select v-model="form.devise"><option>CDF</option><option>USD</option></select></div>
        </div>
        <div class="row">
          <div><label>Objet</label><input v-model="form.objet" required></div>
          <div><label>Bénéficiaire</label><input v-model="form.benef" required></div>
        </div>
        <div class="row">
          <div><label>Référence</label><input value="Générée automatiquement" readonly></div>
          <div><label>Date</label><input type="date" v-model="form.date"></div>
        </div>
        <div class="row">
          <div><label>Justificatif(s)</label><input type="file" multiple></div>
        </div>
        <div style="margin-top:10px;display:flex;gap:10px">
          <button class="btn" type="submit">Soumettre (Soumis)</button>
          <button class="btn secondary" type="button" @click="reset">Réinitialiser</button>
        </div>
      </form>
    </div>

    <!-- Mes retraits (paginés + recherche) -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <h3>Mes retraits</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <input
            v-model="q"
            placeholder="Recherche (réf / motif / bénéficiaire)…"
            @keyup.enter="page=1; loadList()"
            style="min-width:260px"
          >
          <label>
            Taille page
            <select v-model.number="pageSize" @change="page=1; loadList()">
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
          </label>
        </div>
      </div>

      <div class="table">
        <table>
          <thead>
            <tr><th>#</th><th>Date</th><th>Objet</th><th>Bénéficiaire</th><th>Montant</th><th>Devise</th><th>Statut</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in items" :key="r.id">
              <td>{{ r.reference || r.id }}</td>
              <td>{{ r.date }}</td>
              <td>{{ r.objet }}</td>
              <td>{{ r.benef }}</td>
              <td>{{ store.fmtCents(r.montantCents) }}</td>
              <td>{{ r.devise }}</td>
              <td><span class="badge" :class="r.statut">{{ r.statut }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="muted" style="margin-top:8px">Page {{ page }} / {{ Math.max(1, Math.ceil(total/pageSize)) }}</p>
      <div style="display:flex;gap:8px">
        <button class="btn secondary" :disabled="page<=1" @click="page--; loadList()">Précédent</button>
        <button class="btn secondary" :disabled="page>=Math.ceil(total/pageSize)" @click="page++; loadList()">Suivant</button>
        <button class="btn" style="margin-left:auto" @click="loadList()">Actualiser</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useCashStore } from '../stores/cashStore'
import { api } from '../lib/api'
import { useDebouncedWatch } from '../lib/useDebouncedWatch'

const store = useCashStore()

// Form
const form = reactive({
  montant: 300000,
  devise: 'CDF',
  objet: 'Paiement facture fournisseur transport',
  benef: 'Société Y',
  date: store.today()
})

// Pagination (mes retraits)
const items = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const q = ref('') // recherche texte

async function loadList () {
  const params = new URLSearchParams({
    type: 'RETRAIT',
    createdBy: 'me',
    page: String(page.value),
    pageSize: String(pageSize.value),
    sortBy: 'createdAt',
    order: 'desc'
  })
  if (q.value) params.set('q', q.value)
  const data = await api.get('/ops/search?' + params.toString())
  items.value = data.items
  total.value = data.total
}

async function submit () {
  if (!confirm('Confirmez-vous ce retrait ?')) return
  const payload = {
    montantCents: store.toCents(form.montant),
    devise: form.devise,
    objet: form.objet,
    benef: form.benef,
    mode: 'N/A',
    date: form.date
  }
  await store.addRetrait(payload) // recharge aussi KPIs/History/Operations côté store
  await loadList()                // recharge la page paginée
  alert('Retrait soumis.')
  reset()
}
function reset () {
  form.montant = 300000
  form.devise = 'CDF'
  form.objet = 'Paiement facture fournisseur transport'
  form.benef = 'Société Y'
  form.date = store.today()
}

onMounted(async () => {
  try {
    await Promise.all([
      // pas obligé, mais garde l’expérience globale (kpis/historique)
      store.loadHistory(),
      store.loadKpis(),
      loadList()
    ])
  } catch (e) { console.error(e) }
})
// Recherche debounced sur q
useDebouncedWatch(q, () => { page.value = 1; loadList() }, 300)
</script>
