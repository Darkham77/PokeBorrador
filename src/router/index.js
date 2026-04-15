import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/',
      component: () => import('@/views/GameView.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'map',
          component: () => import('@/views/MapView.vue'),
        },
        {
          path: 'team',
          name: 'team',
          component: () => import('@/views/TeamView.vue'),
        },
        {
          path: 'pokedex',
          name: 'pokedex',
          component: () => import('@/views/PokedexView.vue'),
        }
      ]
    }
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  if (authStore.loading) await authStore.checkSession()
  
  if (to.meta.requiresAuth && !authStore.user) {
    next('/login')
  } else if (to.path === '/login' && authStore.user) {
    next('/')
  } else {
    next()
  }
})

export default router
