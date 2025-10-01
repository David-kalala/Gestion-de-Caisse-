<template>
<div class="card" style="max-width:520px;margin:40px auto">
<h2>Création de compte</h2>
<p class="muted">Votre profil devra être <b>approuvé par un Admin</b> avant accès.</p>
<form @submit.prevent="signup">
<div class="row">
<div><label>Nom</label><input v-model="name" required></div>
<div><label>Email</label><input v-model="email" type="email" required></div>
</div>
<div class="row">
<div><label>Mot de passe</label><input v-model="password" type="password" required></div>
<div>
<label>Rôle souhaité</label>
<select v-model="role">
<option value="PERCEPTEUR">Percepteur</option>
<option value="COMPTABLE">Comptable</option>
<option value="MANAGER">Manager</option>
</select>
</div>
</div>
<div style="margin-top:10px;display:flex;gap:8px">
<button class="btn" type="submit">Créer</button>
<RouterLink class="btn secondary" to="/">Retour</RouterLink>
</div>
</form>
</div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'


const router = useRouter(); const auth = useAuthStore()
const name = ref(''); const email = ref(''); const password = ref(''); const role = ref('PERCEPTEUR')


 async function signup(){
   try{
     await auth.signup({ name: name.value, email: email.value, password: password.value, role: role.value })
     alert('Compte créé. En attente d’approbation par un Administrateur.')
     router.push({ name:'pending' })
   } catch(e){ alert(e.message) }
 }
</script>