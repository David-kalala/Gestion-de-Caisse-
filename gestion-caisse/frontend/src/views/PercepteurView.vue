<template>
  <div class="grid grid-2">
    <!-- Formulaire + Ticket -->
    <div class="card">
      <h2>{{ editingId ? 'Modifier un versement' : 'Enregistrer un versement' }}</h2>

      <form @submit.prevent="submit">
        <div class="row">
          <div>
            <label>Montant</label>
            <input type="number" v-model.number="form.montant" min="0" required>
          </div>
          <div>
            <label>Devise</label>
            <select v-model="form.devise">
              <option>CDF</option><option>USD</option>
            </select>
          </div>
        </div>

        <div class="row">
          <div>
            <label>Motif</label>
            <input v-model="form.motif" required>
          </div>
          <div>
            <label>Nom du payeur</label>
            <input v-model="form.payeur" required>
          </div>
        </div>

        <div class="row">
          <div>
            <label>Mode de paiement</label>
            <select v-model="form.mode">
              <option>Espèces</option>
              <option>Virement</option>
              <option>Chèque</option>
              <option>Mobile Money</option>
            </select>
          </div>
          <div>
            <label>Date</label>
            <!-- Interdiction de modifier la date en mode édition -->
            <input type="date" v-model="form.date" :disabled="editingId">
          </div>
        </div>

        <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" type="submit">
            {{ editingId ? 'Enregistrer les modifications' : 'Soumettre (Soumis)' }}
          </button>
          <button class="btn secondary" type="button" @click="reset">Réinitialiser</button>

          <!-- Annuler visible seulement en mode édition -->
          <button
            v-if="editingId"
            class="btn danger"
            type="button"
            @click="cancelEditing()"
          >Annuler ce versement</button>
        </div>
      </form>

      <h3 style="margin-top:16px">Ticket</h3>
      <Ticket :data="ticket" :fmt="(n)=>store.fmtUnit(n)" />
    </div>

    <!-- Mes versements (paginés) -->
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <h3>Mes versements</h3>
       <div style="display:flex;gap:8px;align-items:center">
          <input
            v-model="q"
            placeholder="Recherche (réf / motif / payeur)…"
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
            <tr>
              <th>#</th><th>Date</th><th>Payeur</th><th>Motif</th>
              <th>Montant</th><th>Devise</th><th>Statut</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in items" :key="v.id">
              <td>{{ v.reference || v.id }}</td>
              <td>
                {{ v.date }}
                <div v-if="v.updatedAt" class="muted" style="font-size:12px">
                  Modifié le {{ new Date(v.updatedAt).toLocaleString() }}
                </div>
                <div v-if="v.canceledAt" class="muted" style="font-size:12px">
                  Annulé le {{ new Date(v.canceledAt).toLocaleString() }}
                </div>
              </td>
              <td>{{ v.payeur }}</td>
              <td>{{ v.motif }}</td>
              <td>{{ store.fmtCents(v.montantCents) }}</td>
              <td>{{ v.devise }}</td>
              <td>
                <span class="badge" :class="v.statut">{{ v.statut }}</span>
                <span v-if="v.edited" class="badge MODIFIE" style="margin-bottom:10px">MODIFIÉ</span>
              </td>
              <td>
                <button
                  class="btn secondary"
                  v-if="v.statut==='SOUMIS'"
                  @click="edit(v)"
                >Modifier</button>
              </td>
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
        <button class="btn" style="margin-left:auto" @click="loadList()">Actualiser</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useCashStore } from '../stores/cashStore'
import { api } from '../lib/api'
import Ticket from '../components/Ticket.vue'
import { useDebouncedWatch } from '../lib/useDebouncedWatch'

const store = useCashStore()
const editingId = ref(null)

// Form UI en unités
const form = reactive({
  montant: 500000,
  devise: 'CDF',
  motif: 'Taxe d’importation',
  payeur: 'Société X',
  mode: 'Espèces',
  date: (new Date()).toISOString().slice(0,10)
})

// Ticket
const ticket = reactive({})

// Pagination (mes versements)
const items = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const q = ref('') // recherche texte

async function loadList () {
  const params = new URLSearchParams({
    type: 'VERSEMENT',
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
  if (editingId.value) {
    try {
      const montantCents = store.toCents(form.montant)
      await store.updateVersement(editingId.value, {
        montantCents,
        devise: form.devise,
        motif: form.motif,
        payeur: form.payeur,
        mode: form.mode
      })
      await loadList()
      const row = items.value.find(x => x.id === editingId.value)
      Object.assign(ticket, { id: (row?.reference || editingId.value), ...form, statut: 'SOUMIS' })
      alert('Versement modifié.')
      editingId.value = null
      reset()
    } catch (e) { alert(e.message) }
  } else {
    if (!confirm('Confirmez-vous l’enregistrement de ce versement ?')) return
    const payload = {
      montantCents: store.toCents(form.montant),
      devise: form.devise,
      motif: form.motif,
      payeur: form.payeur,
      mode: form.mode,
      date: form.date
    }
    const o = await store.addVersement(payload)
    await loadList()
    Object.assign(ticket, { ...form, id: (o.reference || o.id), statut: 'SOUMIS' })
    alert('Versement soumis.')
    reset()
  }
}

function edit (v) {
  if (v.statut !== 'SOUMIS') { alert('Non modifiable (pas au statut SOUMIS).'); return }
  editingId.value = v.id
  Object.assign(form, {
    montant: (v.montantCents ?? 0)/100,
    devise: v.devise,
    motif: v.motif,
    payeur: v.payeur,
    mode: v.mode,
    date: v.date // visible mais disabled
  })
}

async function cancelEditing () {
  const id = editingId.value
  const row = items.value.find(x => x.id === id)
  if (!row) return
  if (!confirm(`Annuler le versement ${row.reference || row.id} ?`)) return
  try {
    await store.cancelVersement(row.id)
    await loadList()
    editingId.value = null
    reset()
    alert('Versement annulé.')
  } catch (e) { alert(e.message) }
}

function reset () {
  form.montant = 500000
  form.devise = 'CDF'
  form.motif = 'Taxe d’importation'
  form.payeur = 'Société X'
  form.mode = 'Espèces'
  form.date = (new Date()).toISOString().slice(0,10)
  editingId.value = null
}

onMounted(async () => {
  try {
    await Promise.all([
      store.loadHistory(),
      store.loadKpis(),
      loadList()
    ])
  } catch (e) { console.error(e) }
})
// Recherche debounced sur q
useDebouncedWatch(q, () => { page.value = 1; loadList() }, 300)
</script>
