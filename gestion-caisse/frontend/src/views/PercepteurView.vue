<template>
  <div class="grid grid-2">
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
              <option>Espèces</option><option>Virement</option>
              <option>Chèque</option><option>Mobile Money</option>
            </select>
          </div>
          <div>
            <label>Date</label>
            <input type="date" v-model="form.date" :disabled="!editingId">
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

    <div class="card">
      <h3>Mes versements</h3>
      <div class="table">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Date</th><th>Payeur</th><th>Motif</th>
              <th>Montant</th><th>Devise</th><th>Statut</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in store.versements" :key="v.id">
              <td>{{ v.id }}</td>
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
                <!-- Bouton Modifier seulement si SOUMIS (Annuler est dans le formulaire d'édition) -->
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
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useCashStore } from '../stores/cashStore'
import Ticket from '../components/Ticket.vue'

const store = useCashStore()
const editingId = ref(null)

const form = reactive({
   // UI en unités, STORE/transport en centimes
   montant: 500000, // unités
  devise: 'CDF',
  motif: 'Taxe d’importation',
  payeur: 'Société X',
  mode: 'Espèces',
  date: store.today()
})

const ticket = reactive({})

async function submit  () {
  if (editingId.value) {
    try {
      const montantCents = store.toCents(form.montant)
      await store.updateVersement(editingId.value, { montantCents, devise: form.devise, motif: form.motif, payeur: form.payeur, mode: form.mode, date: form.date })
      Object.assign(ticket, { id: editingId.value, ...form, statut: 'SOUMIS' })
      alert('Versement modifié.')
      editingId.value = null
      reset()
    } catch (e) { alert(e.message) }
  } else {
    const payload = {
      montantCents: store.toCents(form.montant),
      devise: form.devise, motif: form.motif, payeur: form.payeur, mode: form.mode, date: store.today()
    }
    await store.addVersement(payload)
   Object.assign(ticket, { ...form, id: '—', statut: 'SOUMIS' })
    alert('Versement soumis.')
    reset()
  }
}

function edit (v) {
  if (v.statut !== 'SOUMIS') { alert('Non modifiable (pas au statut SOUMIS).'); return }
  editingId.value = v.id
  Object.assign(form, { montant: (v.montantCents ?? 0)/100, devise: v.devise, motif: v.motif, payeur: v.payeur, mode: v.mode, date: v.date })
}

function cancelEditing () {
  const id = editingId.value
  const row = store.versements.find(x => x.id === id)
  if (!row) return
  if (!confirm(`Annuler le versement ${row.id} ?`)) return
  try {
    store.cancelVersement(row.id)
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
  form.date = store.today()
  editingId.value = null
}

onMounted(async () => {
   try {
     await Promise.all([store.loadOperations(), store.loadHistory(), store.loadKpis()])
   } catch (e) { console.error(e) }
 })
</script>

