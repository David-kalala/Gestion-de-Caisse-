<template>
<div class="grid">
<div class="card">
<h2>File d attente des approbations</h2>
<div class="table">
<table>
<thead><tr><th></th><th>Type</th><th>#</th><th>Résumé</th><th>Montant</th><th>Devise</th><th>Date</th></tr></thead>
<tbody>
<tr v-for="x in store.pending" :key="x.id">
<td><input type="checkbox" v-model="selected" :value="{type:x.type,id:x.id}"></td>
<td>{{ x.type }}</td><td>{{ x.id }}</td>
<td>{{ x.type==='VERSEMENT' ? (x.payeur + ' — ' + x.motif) : (x.benef + ' — ' + x.objet) }}</td>
<td>{{ store.fmt(x.montant) }}</td><td>{{ x.devise }}</td><td>{{ x.date }}</td>
</tr>
</tbody>
</table>
</div>
<div style="margin-top:10px;display:flex;gap:8px">
<button class="btn success" @click="decide('APPROUVE')">Approuver</button>
<button class="btn danger" @click="decide('REJETE')">Rejeter</button>
</div>
</div>


<div class="card">
<h3>Solde de caisse (approuvés)</h3>
<div class="kpis">
<div class="kpi"><div class="muted">Entrées</div><strong>{{ store.fmt(store.totals.inSum) }}</strong></div>
<div class="kpi"><div class="muted">Sorties</div><strong>{{ store.fmt(store.totals.outSum) }}</strong></div>
<div class="kpi"><div class="muted">Solde</div><strong>{{ store.fmt(store.totals.solde) }}</strong></div>
</div>
</div>
</div>
</template>
<script setup>
import { ref } from 'vue'
import { useCashStore } from '../stores/cashStore'


const store = useCashStore()
const selected = ref([])
function decide(decision){ if(!selected.value.length){ alert('Sélectionnez au moins un élément.'); return } store.decide(selected.value, decision); selected.value=[] }
</script>