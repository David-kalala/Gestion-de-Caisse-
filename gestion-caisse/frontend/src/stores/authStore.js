import { defineStore } from 'pinia'
import { api } from '../lib/api'

const AUTH_KEY = 'gcaisse-auth-v1'
const load = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb } catch { return fb } }
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v))

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // { user: {...}, token: '...' }
    session: load(AUTH_KEY, null),
    // --- Admin data ---
    users: [],
    adminHistory: []
  }),
  getters: {
    current: (s) => s.session?.user || null,
    token: (s) => s.session?.token || null,
    isAuthenticated: (s) => !!(s.session?.token && s.session?.user),
    isApproved: (s) => !!(s.session?.user?.approved),
    role: (s) => s.session?.user?.role || null,
    can: (s) => (roles) => roles.includes(s.session?.user?.role),
    // --- Admin helpers ---
    pendingUsers: (s) => s.users.filter(u => !u.approved)
  },
  actions: {
    save(){ save(AUTH_KEY, this.session) },
    async login({ email, password }){
      const { token, user } = await api.post('/auth/login', { email, password })
      this.session = { token, user }
      this.save()
      return user
    },
    logout(){ this.session = null; this.save() },
    async signup({ name, email, password, role }){
      const { token, user } = await api.post('/auth/signup', { name, email, password, role })
      this.session = { token, user }
      this.save()
      return user
    },
    // /auth/me pour rafraîchir depuis le token si besoin
    async me(){
      const me = await api.get('/auth/me')
      if (this.session) { this.session.user = me; this.save() }
      return me
    },
    // -------- ADMIN actions --------
    async loadUsers(){ this.users = await api.get('/admin/users') },
    async loadAdminHistory(){ this.adminHistory = await api.get('/admin/audit') },
    async approveUser(id, role){
      await api.post(`/admin/users/${id}/approve`, role ? { role } : {})
      await Promise.all([this.loadUsers(), this.loadAdminHistory()])
    },
    async setRole(id, role){
      await api.patch(`/admin/users/${id}/role`, { role })
      await Promise.all([this.loadUsers(), this.loadAdminHistory()])
    },
    async deleteUser(id){
      await api.del(`/admin/users/${id}`)
      await Promise.all([this.loadUsers(), this.loadAdminHistory()])
    }
  }
})
