<template>
  <div class="grid">
    <!-- Gestion des comptes -->
    <div class="card">
      <div style="display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap">
        <h2>Approbation / gestion des comptes</h2>
        <div style="display:flex;gap:8px">
          <button class="btn secondary" @click="load" :disabled="loading">Actualiser</button>
        </div>
      </div>

      <div v-if="error" class="muted" style="margin:8px 0;color:#fca5a5">Erreur: {{ error }}</div>

      <div class="table" v-if="users.length">
        <table>
          <thead>
            <tr>
              <th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.name }}</td>
              <td>{{ u.email }}</td>
              <td>
                <select v-model="roles[u.id]">
                  <option value="PERCEPTEUR">Percepteur</option>
                  <option value="COMPTABLE">Comptable</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </td>
              <td>
                <span class="badge" :class="u.approved ? 'APPROUVE' : 'SOUMIS'">
                  {{ u.approved ? 'APPROUVÉ' : 'EN ATTENTE' }}
                </span>
              </td>
              <td style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn success" :disabled="u.approved || loading" @click="approve(u.id)">Approuver</button>
                <button class="btn" :disabled="loading" @click="applyRole(u.id)">Appliquer rôle</button>
                <button class="btn danger" :disabled="u.id===meId || loading" @click="removeUser(u.id)">Supprimer</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="muted">Aucun utilisateur pour le moment.</p>
      <p v-if="loading" class="muted" style="margin-top:8px">Chargement…</p>
    </div>

    <!-- Audit Admin -->
    <div class="card">
      <h3>Historique des actions Admin</h3>
      <div class="table" v-if="audit.length">
        <table>
          <thead>
            <tr><th>Date/Heure</th><th>Admin</th><th>Action</th><th>Détails</th></tr>
          </thead>
          <tbody>
            <tr v-for="a in audit" :key="a.id">
              <td>{{ new Date(a.ts).toLocaleString() }}</td>
              <td>{{ a.admin || '—' }}</td>
              <td>{{ a.action }}</td>
              <td class="muted">{{ a.payload && JSON.stringify(a.payload) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="muted">Aucun événement pour le moment.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'

const auth = useAuthStore()
const meId = auth.current?.id

const users = ref([])
const roles = ref({})
const audit = ref([])

const loading = ref(false)
const error = ref('')

async function load () {
  loading.value = true
  error.value = ''
  try {
    const [list, logs] = await Promise.all([
      api.get('/admin/users'),
      api.get('/admin/audit')
    ])
    users.value = list
    audit.value = logs
    // init sélecteurs de rôles
    const map = {}
    list.forEach(u => { map[u.id] = u.role })
    roles.value = map
  } catch (e) {
    error.value = e?.message || 'Impossible de charger les données'
  } finally {
    loading.value = false
  }
}

async function approve (id) {
  try {
    loading.value = true
    await api.post(`/admin/users/${id}/approve`, {})
    await load()
    alert('Utilisateur approuvé')
  } catch (e) {
    alert(e?.message || 'Erreur à l’approbation')
  } finally {
    loading.value = false
  }
}

async function applyRole (id) {
  const role = roles.value[id]
  if (!role) return alert('Choisir un rôle')
  try {
    loading.value = true
    await api.post(`/admin/users/${id}/role`, { role })
    await load()
    alert('Rôle mis à jour')
  } catch (e) {
    alert(e?.message || 'Erreur lors du changement de rôle')
  } finally {
    loading.value = false
  }
}

async function removeUser (id) {
  if (!confirm('Supprimer ce compte ?')) return
  try {
    loading.value = true
    await api.del(`/admin/users/${id}`)
    await load()
    alert('Compte supprimé')
  } catch (e) {
    alert(e?.message || 'Erreur lors de la suppression')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
