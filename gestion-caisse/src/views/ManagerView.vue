<template>
  <div class="grid">
    <!-- En attente des approbations -->
    <div class="card">
      <h2>En attente des approbations</h2>
      <div class="table">
        <table>
          <thead>
            <tr>
              <th></th><th>Type</th><th>#</th><th>Résumé</th>
              <th>Montant</th><th>Devise</th><th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="x in store.pending" :key="x.id">
              <td><input type="checkbox" v-model="selected" :value="{type:x.type,id:x.id}"></td>
              <td>{{ x.type }}</td>
              <td>{{ x.id }}</td>
              <td>{{ x.type==='VERSEMENT' ? (x.payeur + ' — ' + x.motif) : (x.benef + ' — ' + x.objet) }}</td>
              <td>{{ store.fmt(x.montant) }}</td>
              <td>{{ x.devise }}</td>
              <td>{{ x.date }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px">
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
            <strong>{{ store.fmt(totalsDev.inSum) }}</strong>
          </div>
          <div class="kpi">
            <div class="muted">Sorties ({{ devise }})</div>
            <strong>{{ store.fmt(totalsDev.outSum) }}</strong>
          </div>
          <div class="kpi">
            <div class="muted">Solde ({{ devise }})</div>
            <strong>{{ store.fmt(totalsDev.solde) }}</strong>
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
          <td>{{ h.actor }}</td>
          <td>{{ h.action }}</td>
          <td>{{ h.ref }}</td>
          <td>{{ store.fmt(h.montant) }}</td>
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
import { ref, computed, watch } from 'vue'
import { useCashStore } from '../stores/cashStore'

const store = useCashStore()
const selected = ref([])

function decide(decision){
  if(!selected.value.length){ alert('Sélectionnez au moins un élément.'); return }
  store.decide(selected.value, decision)
  selected.value = []
}

/** Liste des devises présentes dans les totaux (approuvés) */
const currencies = computed(() => Object.keys(store.totalsByCurrency))

/** Devise sélectionnée (par défaut, la première dispo) */
const devise = ref(null)
watch(currencies, (list) => {
  if (list.length && !devise.value) devise.value = list[0]
}, { immediate: true })

/** Totaux de la devise sélectionnée */
const totalsDev = computed(() => devise.value ? store.totalsByCurrency[devise.value] : null)
</script>
