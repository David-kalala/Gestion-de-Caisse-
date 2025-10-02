<template>
<header class="top">
<nav class="nav">
<RouterLink v-if="auth.role==='PERCEPTEUR'" to="/percepteur" :class="{active: $route.name==='percepteur'}">Percepteur</RouterLink>
<RouterLink v-if="auth.role==='COMPTABLE'" to="/comptable" :class="{active: $route.name==='comptable'}">Comptable</RouterLink>
<RouterLink v-if="auth.role==='MANAGER'" to="/manager" :class="{active: $route.path.startsWith('/manager')}">Manager</RouterLink>
<RouterLink v-if="auth.role==='ADMIN'" to="/admin" :class="{active: $route.name==='admin'}">Admin</RouterLink>
<span style="flex:1"></span>
<template v-if="auth.isAuthenticated">
<span class="muted">{{ auth.current.name }} ({{ auth.role }})</span>
<button class="btn secondary" @click="logout">Se déconnecter</button>
</template>
</nav>
</header>
<main class="container">
<RouterView />
</main>
</template>
<script setup>
import { useAuthStore } from './stores/authStore'
const auth = useAuthStore()
function logout(){ auth.logout(); window.location.href='/' }
</script>
<style scoped>
.top{position:sticky;top:0;background:rgba(11,18,32,.85);backdrop-filter:blur(8px);border-bottom:1px solid #1f2937}
.nav{max-width:1100px;margin:0 auto;padding:14px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.nav a{color:#cbd5e1;text-decoration:none;border:1px solid #1f2937;padding:8px 12px;border-radius:10px}
.nav a.active{background:#2563eb;border-color:#2563eb;color:#fff}
.muted{color:#94a3b8;margin-right:8px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;border:1px solid #2563eb;background:#2563eb;color:#fff;cursor:pointer}
.btn.secondary{background:transparent;color:#cbd5e1;border-color:#334155}
.container{max-width:1100px;margin:0 auto;padding:16px}
</style>