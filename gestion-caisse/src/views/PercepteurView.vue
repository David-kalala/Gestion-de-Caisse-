<template>
<div class="grid grid-2">
<div class="card">
<h2>Enregistrer un versement</h2>
<form @submit.prevent="submit">
<div class="row">
<div><label>Montant</label><input type="number" v-model.number="form.montant" min="0" required></div>
<div><label>Devise</label><select v-model="form.devise"><option>CDF</option><option>USD</option></select></div>
</div>
<div class="row">
<div><label>Motif</label><input v-model="form.motif" required></div>
<div><label>Nom du payeur</label><input v-model="form.payeur" required></div>
</div>
<div class="row">
<div><label>Mode de paiement</label><select v-model="form.mode"><option>Espèces</option><option>Virement</option><option>Chèque</option><option>Mobile Money</option></select></div>
<div><label>Date</label><input type="date" v-model="form.date"></div>
</div>
<div style="margin-top:10px;display:flex;gap:10px">
<button class="btn" type="submit">Soumettre (Soumis)</button>
<button class="btn secondary" type="button" @click="reset">Réinitialiser</button>
</div>
</form>
<h3 style="margin-top:16px">Ticket</h3>
<Ticket :data="ticket" :fmt="store.fmt" />
</div>


<div class="card">
<h3>Mes versements</h3>
<div class="table">
<table>
<thead><tr><th>#</th><th>Date</th><th>Payeur</th><th>Motif</th><th>Montant</th><th>Devise</th><th>Statut</th></tr></thead>
<tbody>
<tr v-for="v in store.versements" :key="v.id">
<td>{{ v.id }}</td><td>{{ v.date }}</td><td>{{ v.payeur }}</td><td>{{ v.motif }}</td>
<td>{{ store.fmt(v.montant) }}</td><td>{{ v.devise }}</td><td><span class="badge" :class="v.statut">{{ v.statut }}</span></td>
</tr>
</tbody>
</table>
</div>
</div>
</div>
</template>
<script setup>
import { reactive } from 'vue'
import { useCashStore } from '../stores/cashStore'
import Ticket from '../components/Ticket.vue'


const store = useCashStore()
const form = reactive({ montant:500000, devise:'CDF', motif:"Taxe d’importation", payeur:'Société X', mode:'Espèces', date: store.today() })
const ticket = reactive({})


function submit(){ const v = { id: store.uid('V'), ...form, statut:'SOUMIS' }; store.addVersement(v); Object.assign(ticket, v); alert('Versement soumis.') }
function reset(){ form.montant=500000; form.devise='CDF'; form.motif="Taxe d’importation"; form.payeur='Société X'; form.mode='Espèces'; form.date=store.today() }
</script>