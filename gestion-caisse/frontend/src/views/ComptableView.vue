<template>
<div class="grid grid-2">
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
<div><label>Référence facture</label><input v-model="form.ref" required></div>
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


<div class="card">
<h3>Mes retraits</h3>
<div class="table">
<table>
<thead><tr><th>#</th><th>Date</th><th>Objet</th><th>Bénéficiaire</th><th>Montant</th><th>Devise</th><th>Statut</th></tr></thead>
<tbody>
<tr v-for="r in store.retraits" :key="r.id">
<td>{{ r.id }}</td><td>{{ r.date }}</td><td>{{ r.objet }}</td><td>{{ r.benef }}</td>
<td>{{ store.fmtCents(r.montantCents) }}</td><td>{{ r.devise }}</td><td><span class="badge" :class="r.statut">{{ r.statut }}</span></td>
</tr>
</tbody>
</table>
</div>
</div>
</div>
</template>
<script setup>
import { reactive, onMounted } from 'vue'
import { useCashStore } from '../stores/cashStore'


const store = useCashStore()
const form = reactive({ montant:300000, devise:'CDF', objet:'Paiement facture fournisseur transport', benef:'Société Y', ref:'FCT-2025-009', date: store.today() })
 function submit(){
   const payload = {
     montantCents: store.toCents(form.montant),
     devise: form.devise, objet: form.objet, benef: form.benef, mode: 'N/A', date: form.date
   }
   store.addRetrait(payload); alert('Retrait soumis.')
 }
function reset(){ form.montant=300000; form.devise='CDF'; form.objet='Paiement facture fournisseur transport'; form.benef='Société Y'; form.ref='FCT-2025-009'; form.date=store.today() }
onMounted(async () => {
   try {
     await Promise.all([store.loadOperations(), store.loadHistory(), store.loadKpis()])
   } catch (e) { console.error(e) }
 })
</script>

