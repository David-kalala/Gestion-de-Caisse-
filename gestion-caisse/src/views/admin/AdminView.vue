<template>
  <div class="grid">
    <div class="card">
      <h2>Approbation / gestion des comptes</h2>
      <div class="table" v-if="auth.users.length">
        <table>
          <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            <tr v-for="u in auth.users" :key="u.id">
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
              <td><span class="badge" :class="u.approved ? 'APPROUVE' : 'SOUMIS'">{{ u.approved ? 'APPROUVÉ' : 'EN ATTENTE' }}</span></td>
              <td style="display:flex;gap:8px">
                <button class="btn success" @click="approve(u.id)">Approuver</button>
                <button class="btn" @click="applyRole(u.id)">Appliquer rôle</button>
                <button class="btn danger" @click="remove(u.id)">Supprimer</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="muted">Aucun utilisateur.</p>
    </div>

    <div class="card">
      <h3>Historique des actions Admin</h3>
      <div class="table">
        <table>
          <thead><tr><th>Date/Heure</th><th>Admin</th><th>Action</th><th>Détails</th></tr></thead>
          <tbody>
            <tr v-for="a in auth.adminHistory" :key="a.id">
              <td>{{ new Date(a.ts).toLocaleString() }}</td>
              <td>{{ a.actor }}</td>
              <td>{{ a.action }}</td>
              <td class="muted">{{ a.payload && JSON.stringify(a.payload) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="muted">Journal en lecture seule (non modifiable).</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { useAuthStore } from '../../stores/authStore'
const auth = useAuthStore()
const pending = computed(()=> auth.pendingUsers)
const roles = reactive({})

function approve(id){ auth.approveUser(id, roles[id] || 'PERCEPTEUR'); alert('Utilisateur approuvé'); }
function applyRole(id){ const r = roles[id]; if(!r) return alert('Choisir un rôle'); auth.setRole(id, r); alert('Rôle mis à jour'); }
function remove(id){ if(confirm('Supprimer ce compte ?')){ auth.deleteUser(id); alert('Supprimé') } }
</script>
