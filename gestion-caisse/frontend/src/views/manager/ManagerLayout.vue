<template>
  <div>
    <div class="card" style="margin-bottom:12px">
      <nav style="display:flex; gap:8px; flex-wrap:wrap">
        <RouterLink :class="['tab', $route.name==='manager-dashboard' && 'active']" :to="{name:'manager-dashboard'}">📊 Dashboard</RouterLink>
        <RouterLink :class="['tab', $route.name==='manager-approvals' && 'active']" :to="{name:'manager-approvals'}">✅ Demandes à traiter</RouterLink>
      </nav>
    </div>
    <RouterView />
  </div>
</template>

<script setup>
</script>

<style scoped>
.tab{color:#cbd5e1;text-decoration:none;border:1px solid var(--border);padding:8px 12px;border-radius:10px}
.tab.active{background:var(--primary);border-color:var(--primary);color:#fff}
</style>
