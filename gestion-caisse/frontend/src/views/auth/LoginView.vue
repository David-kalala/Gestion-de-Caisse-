<template>
<div class="card" style="max-width:480px;margin:40px auto">
<h2>Connexion</h2>
<form @submit.prevent="login">
<div class="row">
<div><label>Email</label><input v-model="email" type="email" required></div>
<div><label>Mot de passe</label><input v-model="password" type="password" required></div>
</div>
<div style="margin-top:10px;display:flex;gap:8px">
<button class="btn" type="submit">Se connecter</button>
<RouterLink class="btn secondary" to="/signup">Créer un compte</RouterLink>
</div>
</form>
</div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'


const router = useRouter(); const route = useRoute(); const auth = useAuthStore()
const email = ref(''); const password = ref('')


async function login(){
try{
await auth.login({email: email.value, password: password.value})
if(!auth.isApproved) return router.push({ name:'pending' })
const map = { ADMIN:'admin', PERCEPTEUR:'percepteur', COMPTABLE:'comptable', MANAGER:'manager-dashboard' }
const dest = route.query.redirect || { name: map[auth.role] || 'percepteur' }
router.push(dest)
}catch(e){ alert(e.message) }
}
</script>