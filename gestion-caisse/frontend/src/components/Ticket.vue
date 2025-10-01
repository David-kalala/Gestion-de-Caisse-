<template>
  <div class="ticket">
    <strong>Douanes RDC — Ticket de versement</strong>
    <p class="muted">Ticket # {{ data.reference || data.id || '—' }}</p>

    <p><b>Payeur :</b> {{ data.payeur }}</p>
    <p><b>Motif :</b> {{ data.motif }}</p>
    <p><b>Montant :</b> {{ fmt ? fmt(data.montant) : data.montant }} {{ data.devise }}</p>
    <p><b>Mode :</b> {{ data.mode }}</p>
    <p><b>Date :</b> {{ data.date }}</p>
    <p><i>Statut : {{ data.statut || 'Soumis (en attente d’approbation du Manager)' }}</i></p>

    <div style="margin-top:10px">
      <button class="btn secondary" @click="print">Imprimer</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  data: { type: Object, default: () => ({}) },
  fmt: { type: Function, default: null }
})
function print () { window.print() }
</script>
