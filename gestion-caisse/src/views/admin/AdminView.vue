<template>
<div class="grid">
<div class="card">
<h2>Approbation des comptes</h2>
<div class="table" v-if="pending.length">
<table>
<thead><tr><th>Nom</th><th>Email</th><th>Rôle demandé</th><th>Action</th></tr></thead>
<tbody>
<tr v-for="u in pending" :key="u.id">
<td>{{ u.name }}</td>
<td>{{ u.email }}</td>
<td>
<select v-model="roles[u.id]">
<option value="PERCEPTEUR">Percepteur</option>
<option value="COMPTABLE">Comptable</option>
<option value="MANAGER">Manager</option>
</select>
</td>
<td style="display:flex;gap:8px">
<button class="btn success" @click="approve(u.id)">Approuver</button>
<button class="btn danger" @click="remove(u.id)">Supprimer</button>
</td>
</tr>
</tbody>
</table>
</div>
<p v-else class="muted">Aucun compte en attente.</p>
</div>


<div class="card">
<h3>Utilisateurs existants</h3>
<div class="table">
<table>
<thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th></tr></thead>
<tbody>
<tr v-for="u in auth.users" :key="u.id">
<td>{{ u.name }}</td>
<td>{{ u.email }}</td>
<td>{{ u.role }}</td>
<td><span class="badge" :class="u.approved ? 'APPROUVE' : 'SOUMIS'">{{ u.approved ? 'APPROUVÉ' : 'EN ATTENTE' }}</span></td>
</tr>
</tbody>
</table>
</div>
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
function remove(id){ if(confirm('Supprimer ce compte ?')){ auth.deleteUser(id); alert('Supprimé') } }
</script>