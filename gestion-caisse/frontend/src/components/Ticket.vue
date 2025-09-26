<template>
<div class="ticket">
<strong>Douanes RDC — Ticket de versement</strong>
<p class="muted">Ticket # {{ data.id || '—' }}</p>
<p><b>Payeur :</b> {{ data.payeur }}</p>
<p><b>Motif :</b> {{ data.motif }}</p>
<p><b>Montant :</b> {{ fmt(data.montant) }} {{ data.devise }}</p>
<p><b>Mode :</b> {{ data.mode }}</p>
<p><b>Date :</b> {{ data.date }}</p>
<p><i>Statut : Soumis (en attente d’approbation du Manager)</i></p>
<div style="margin-top:10px"><button class="btn secondary" @click="print">Imprimer</button></div>
</div>
</template>
<script setup>
const props = defineProps({ data: { type: Object, default: ()=>({}) }, fmt: Function })
function print(){ window.print() }
</script>