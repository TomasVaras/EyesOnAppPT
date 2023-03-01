import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '',
    redirect: '/sensor/EyesOnPT'
  },
  {
    path: '/sensor/:filter',
    component: () => import ('../views/SensorListView.vue')
  },
  {
    path: '/sensor/registers/:name/:id',
    component: () => import ('../views/ListRegisters.vue')
  },
  /*{
    path: '/sensor/connected-devices',
    component: () => import ('../views/ListConnectedView.vue')
  }*/
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
