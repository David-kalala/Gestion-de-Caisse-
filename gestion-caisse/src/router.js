import { createRouter, createWebHistory } from 'vue-router'
import PercepteurView from './views/PercepteurView.vue'
import ComptableView from './views/ComptableView.vue'
import ManagerView from './views/ManagerView.vue'


const routes = [
{ path: '/', redirect: '/percepteur' },
{ name: 'percepteur', path: '/percepteur', component: PercepteurView },
{ name: 'comptable', path: '/comptable', component: ComptableView },
{ name: 'manager', path: '/manager', component: ManagerView },
]


const router = createRouter({ history: createWebHistory(), routes })
export default router