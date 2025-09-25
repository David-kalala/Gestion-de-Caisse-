import { defineStore } from 'pinia'


export const useAuthStore = defineStore('auth', {
state: () => ({
current: load(AUTH_KEY, null), // {id,name,email,role,approved}
users: load(USERS_KEY, []),
}),
getters: {
isAuthenticated: (s) => !!s.current,
isApproved: (s) => !!(s.current && s.current.approved),
role: (s) => s.current?.role || null,
can: (s) => (roles) => roles.includes(s.current?.role),
pendingUsers: (s) => s.users.filter(u => !u.approved),
},
actions: {
saveAll(){ save(AUTH_KEY, this.current); save(USERS_KEY, this.users) },


// Inscription: crée un profil non approuvé (role optionnel, défini/confirmé par admin)
signup({name, email, password, role}){
if(this.users.some(u => u.email === email)) throw new Error('Email déjà utilisé')
const u = { id: 'U-'+Math.random().toString(36).slice(2,8), name, email, password, role: role||'PERCEPTEUR', approved:false }
this.users.push(u); this.saveAll(); return u
},


// Connexion: simple vérification locale (démo). En prod -> backend & tokens.
login({email, password}){
const u = this.users.find(u => u.email===email && u.password===password)
if(!u) throw new Error('Identifiants invalides')
this.current = { id:u.id, name:u.name, email:u.email, role:u.role, approved:u.approved }
this.saveAll(); return this.current
},


logout(){ this.current = null; this.saveAll() },


// Admin only
approveUser(id, role){
const u = this.users.find(x=>x.id===id)
if(!u) throw new Error('Utilisateur introuvable')
u.approved = true
if(role) u.role = role
// si l'utilisateur approuvé est actuellement connecté, propager le changement
if(this.current?.id === id){ this.current.role = u.role; this.current.approved = true }
this.saveAll();
},
deleteUser(id){ this.users = this.users.filter(u=>u.id!==id); if(this.current?.id===id){ this.current=null } this.saveAll() },
}
})