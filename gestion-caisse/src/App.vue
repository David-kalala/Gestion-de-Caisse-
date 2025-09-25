<template>
<header class="top">
<nav class="nav">
<RouterLink to="./views/PercepteurView" :class="{active: $route.name==='PercepteurView'}">Percepteur</RouterLink>
<RouterLink to="./views/ComptableView" :class="{active: $route.name==='ComptableView'}">Comptable</RouterLink>
<RouterLink to="./views/ManagerView" :class="{active: $route.name==='ManagerView'}">Manager</RouterLink>
</nav>
</header>
<main class="container">
<RouterView />
</main>
</template>


<script setup>
</script>


<style scoped>
.top{position:sticky;top:0;background:rgba(11,18,32,.85);backdrop-filter:blur(8px);border-bottom:1px solid #1f2937}
.nav{max-width:1100px;margin:0 auto;padding:14px 16px;display:flex;gap:8px;flex-wrap:wrap}
.nav a{color:#cbd5e1;text-decoration:none;border:1px solid #1f2937;padding:8px 12px;border-radius:10px}
.nav a.active{background:#2563eb;border-color:#2563eb;color:#fff}
.container{max-width:1100px;margin:0 auto;padding:16px}
</style>