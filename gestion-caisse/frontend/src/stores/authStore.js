import { defineStore } from 'pinia'

const AUTH_KEY  = 'gcaisse-auth-v1'
const USERS_KEY = 'gcaisse-users-v1'
const ADMIN_AUDIT_KEY = 'gcaisse-admin-audit-v1' 
const load = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback } }
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value))

function ensureAdmin(users) {
  const list = Array.isArray(users) ? users : []
  if (!list.some(u => u.email === 'admin@caisse.local')) {
    list.push({ id: 'U-admin', name: 'Admin', email: 'admin@caisse.local', password: 'admin', role: 'ADMIN', approved: true })
    save(USERS_KEY, list)
  }
  return list
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    current: load(AUTH_KEY, null),
    users: ensureAdmin(load(USERS_KEY, [])),
    adminAudit: load(ADMIN_AUDIT_KEY, []), 
  }),
  getters: {
    isAuthenticated: (s) => !!s.current,
    isApproved: (s) => !!(s.current && s.current.approved),
    role: (s) => s.current?.role || null,
    can: (s) => (roles) => roles.includes(s.current?.role),
    pendingUsers: (s) => s.users.filter(u => !u.approved),
    adminHistory: (s) => [...s.adminAudit].reverse(), 
  },
  actions: {
    saveAll(){ save(AUTH_KEY, this.current); save(USERS_KEY, this.users); save(ADMIN_AUDIT_KEY, this.adminAudit) },

    // journal immuable
    logAdmin(action, payload){
      this.adminAudit.push({ id: 'A-'+Math.random().toString(36).slice(2,8), ts: new Date().toISOString(), actor: this.current?.email || 'system', action, payload })
      this.saveAll()
    },

    signup({name, email, password, role}){
      if(this.users.some(u => u.email === email)) throw new Error('Email déjà utilisé')
      const u = { id: 'U-'+Math.random().toString(36).slice(2,8), name, email, password, role: role||'PERCEPTEUR', approved:false }
      this.users.push(u); this.saveAll(); return u
    },
    login({email, password}){
      const u = this.users.find(u => u.email===email && u.password===password)
      if(!u) throw new Error('Identifiants invalides')
      this.current = { id:u.id, name:u.name, email:u.email, role:u.role, approved:u.approved }
      this.saveAll(); return this.current
    },
    logout(){ this.current = null; this.saveAll() },

    approveUser(id, role){
      const u = this.users.find(x=>x.id===id); if(!u) throw new Error('Utilisateur introuvable')
      const prevRole = u.role
      u.approved = true
      if(role) u.role = role
      if(this.current?.id === id){ this.current.role = u.role; this.current.approved = true }
      this.saveAll()
      this.logAdmin('APPROVE_USER', { userId:id, roleFrom: prevRole, roleTo: u.role }) // NEW
    },
    // changement de rôle explicite
    setRole(id, role){
      const u = this.users.find(x=>x.id===id); if(!u) throw new Error('Utilisateur introuvable')
      const prevRole = u.role
      u.role = role
      if(this.current?.id === id){ this.current.role = role }
      this.saveAll()
      this.logAdmin('SET_ROLE', { userId:id, roleFrom: prevRole, roleTo: role })
    },
    deleteUser(id){
      const u = this.users.find(x=>x.id===id)
      this.users = this.users.filter(u=>u.id!==id)
      if(this.current?.id===id){ this.current=null }
      this.saveAll()
      this.logAdmin('DELETE_USER', { userId:id, email:u?.email })
    },
  }
})
