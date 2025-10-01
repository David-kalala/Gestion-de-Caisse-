<template>
  <div class="card" style="max-width:520px;margin:40px auto">
    <h2>Compte en attente</h2>
    <p>Votre profil est en attente d'approbation par un <b>Administrateur</b>.</p>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn" @click="refresh">Vérifier l'approbation</button>
      <button class="btn secondary" @click="logout">Se déconnecter</button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
const router = useRouter()
const auth = useAuthStore()

async function refresh(){
  try {
    await auth.me()
    if (auth.isApproved) {
      const map = { ADMIN:'admin', PERCEPTEUR:'percepteur', COMPTABLE:'comptable', MANAGER:'manager' }
      router.push({ name: map[auth.role] || 'percepteur' })
    } else {
      alert('Toujours en attente...')
    }
  } catch(e){ alert(e.message) }
}

function logout(){
  auth.logout()
  location.href = '/'
}
</script>
