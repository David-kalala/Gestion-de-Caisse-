import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/authStore'
// vues
import LoginView from './views/auth/LoginView.vue'
import SignupView from './views/auth/SignupView.vue'
import PendingApprovalView from './views/auth/PendingApprovalView.vue'
import ForbiddenView from './views/auth/ForbiddenView.vue'
import PercepteurView from './views/PercepteurView.vue'
import ComptableView from './views/ComptableView.vue'
import AdminView from './views/admin/AdminView.vue'
import ManagerDashboard from './views/manager/ManagerDashboard.vue'
import ManagerLayout from './views/manager/ManagerLayout.vue'
import ManagerApprovals from './views/manager/ManagerApprovals.vue'


const routes = [
{ name:'login', path:'/', component: LoginView },
{ name:'signup', path:'/signup', component: SignupView },
{ name:'pending', path:'/pending', component: PendingApprovalView },
{ name:'forbidden', path:'/403', component: ForbiddenView },


{ name: 'percepteur', path: '/percepteur', component: PercepteurView, meta:{ requiresAuth:true, roles:['PERCEPTEUR'] } },
{ name: 'comptable', path: '/comptable', component: ComptableView, meta:{ requiresAuth:true, roles:['COMPTABLE'] } },



{ name: 'admin', path: '/admin', component: AdminView, meta:{ requiresAuth:true, roles:['ADMIN'] } },

{ path: '/manager',
  component: ManagerLayout,
  meta:{ requiresAuth:true, roles:['MANAGER'] },
  children: [
    { name: 'manager-dashboard', path: '', component: ManagerDashboard },
    { name: 'manager-approvals', path: 'approvals', component: ManagerApprovals }
  ]
},
]


const router = createRouter({ history: createWebHistory(), routes })


router.beforeEach((to) => {
const auth = useAuthStore()


// Routes publiques
if(['login','signup'].includes(to.name)){
// si déjà connecté et approuvé -> rediriger vers page rôle
if(auth.isAuthenticated && auth.isApproved){
const map = { ADMIN:'admin', PERCEPTEUR:'percepteur', COMPTABLE:'comptable', MANAGER:'manager-dashboard' }
return { name: map[auth.role] || 'percepteur' }
}
return true
}


// Routes protégées
if(to.meta?.requiresAuth){
if(!auth.isAuthenticated) return { name:'login', query:{ redirect: to.fullPath } }
if(!auth.isApproved) return { name:'pending' }
if(to.meta?.roles && !to.meta.roles.includes(auth.role)) return { name:'forbidden' }
}
return true
})


export default router