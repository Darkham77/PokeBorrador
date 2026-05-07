import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { logger } from '@/logic/utils/logger'

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
        // {
        //   path: 'team',
        //   name: 'team',
        //   component: () => import('@/views/TeamView.vue'),
        // },
        {
          path: 'pokedex',
          name: 'pokedex',
          component: () => import('@/views/PokedexView.vue'),
        },
        {
          path: 'social',
          name: 'social',
          component: () => import('@/views/SocialView.vue'),
        },
        {
          path: 'events',
          name: 'events',
          component: () => import('@/views/EventsView.vue'),
        },
        {
          path: 'war',
          name: 'war',
          component: () => import('@/views/WarView.vue'),
        },

        {
          path: 'bag',
          name: 'bag',
          component: () => import('@/views/BagView.vue'),
        },
        {
          path: 'daycare',
          name: 'daycare',
          component: () => import('@/views/DaycareView.vue'),
        }
      ]
    }
  ],
})

router.beforeEach(async (to, _from) => {
  const authStore = useAuthStore()
  
  if (authStore.loading) await authStore.checkSession()
  
  if (to.path === '/login' && authStore.user) {
    logger.info('Router', 'Forzando limpieza de sesión por acceso a /login');
    authStore.clearSessionLocal();
  }
  
  if (to.meta.requiresAuth && !authStore.user) {
    return '/login';
  }
  
  return true;
})

export default router
