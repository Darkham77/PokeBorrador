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
          path: 'pc',
          name: 'pc',
          component: () => import('@/views/PCBoxView.vue'),
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

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  if (authStore.loading) await authStore.checkSession()
  
  // MANDATO: Si se accede a /login, forzar deslogueo para nueva sesión
  // Se hace después de checkSession para detectar usuarios autologueados
  if (to.path === '/login' && authStore.user) {
    console.log('[Router] Forzando deslogueo por acceso a /login');
    await authStore.logout();
    return;
  }
  
  if (to.meta.requiresAuth && !authStore.user) {
    next('/login')
  } else {
    next()
  }
})

export default router
