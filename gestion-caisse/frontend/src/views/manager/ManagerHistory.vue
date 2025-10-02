<template>
  <div class="grid">
    <div class="card">
      <h2>Historique</h2>

      <div class="row">
        <div>
          <label>Type</label>
          <select v-model="kind" @change="page=1; load()">
            <option value="">(Tous)</option>
            <option value="VERSEMENT">Versements</option>
            <option value="RETRAIT">Retraits</option>
          </select>
        </div>
        <div>
          <label>Recherche (réf / motif / payeur / bénéficiaire)</label>
          <input
            v-model="q"
            placeholder="ex: RET-20251001 / Société X / entretien…"
            @keyup.enter="page=1; load()"
          >
        </div>
      </div>

      <div class="table" style="margin-top:10px" v-if="items.length">
        <table>
          <thead>
            <tr>
              <th>Date/Heure</th><th>Auteur</th><th>Action</th><th>Réf</th>
              <th>Montant</th><th>Devise</th><th>Motif</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in items" :key="h.id">
              <td>{{ new Date(h.ts).toLocaleString() }}</td>
              <td>{{ h.actor || '—' }}</td>
              <td>{{ h.action }}</td>
              <td>{{ h.ref }}</td>
              <td>{{ fmt(h.montant) }}</td>
              <td>{{ h.devise }}</td>
              <td>{{ h.motif ?? h.meta?.motif ?? h.meta?.objet ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="muted">—</p>

      <p class="muted" style="margin-top:8px">
        Page {{ page }} / {{ Math.max(1, Math.ceil(total/pageSize)) }}
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn secondary" :disabled="page<=1" @click="page--; load()">Précédent</button>
        <button class="btn secondary" :disabled="page>=Math.ceil(total/pageSize)" @click="page++; load()">Suivant</button>
        <label style="margin-left:auto">
          Taille page
          <select v-model.number="pageSize" @change="page=1; load()">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </label>
        <button class="btn" @click="page=1; load()">Rechercher</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../../lib/api'
import { useDebouncedWatch } from '../../lib/useDebouncedWatch'

const items = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const kind = ref('') // '', 'VERSEMENT', 'RETRAIT'
const q = ref('')    // texte libre

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Number(n || 0))

async function load () {
  const params = new URLSearchParams({
    page: String(page.value),
    pageSize: String(pageSize.value)
  })
  if (kind.value) params.set('kind', kind.value)
  if (q.value)     params.set('q', q.value)
  const data = await api.get('/history/search?' + params.toString())
  items.value = data.items
  total.value = data.total
}

onMounted(load)
// Déclenche la recherche 300ms après la dernière frappe
useDebouncedWatch(q, () => { page.value = 1; load() }, 300)
</script>
