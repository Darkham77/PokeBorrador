import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { logger } from '@/logic/utils/logger'
import { safeStorage } from '@/logic/utils/storage'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
    },


    {
      path: '/',
      component: () => import('@/views/game/GameView.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'map',
          component: () => import('@/views/game/MapView.vue'),
        },
        // {
        //   path: 'team',
        //   name: 'team',
        //   component: () => import('@/views/TeamView.vue'),
        // },
        {
          path: 'pokedex',
          name: 'pokedex',
          component: () => import('@/views/pokemon/PokedexView.vue'),
        },
        {
          path: 'social',
          name: 'social',
          component: () => import('@/views/social/SocialView.vue'),
        },
        {
          path: 'bag',
          name: 'bag',
          component: () => import('@/views/inventory/BagView.vue'),
        }
      ]
    }
  ],
})

router.beforeEach(async (to, _from) => {
  const authStore = useAuthStore()
  
  // 1. Initial auth check
  if (authStore.loading) await authStore.checkSession()
  
  // 2. Handle DB import reload
  const isImportReload = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pokevicio_import_reload') === 'true';
  if (isImportReload) {
    const importOriginalPath = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pokevicio_import_original_path') : null;
    sessionStorage.removeItem('pokevicio_import_reload');
    sessionStorage.removeItem('pokevicio_import_original_path');
    
    if (authStore.user && importOriginalPath !== '/login') {
      logger.info('Router', `Importación de DB completada. Redirigiendo a original: ${importOriginalPath}`);
      return importOriginalPath || '/';
    }
    
    logger.info('Router', 'Importación de DB completada. Limpiando sesión para inicio limpio en login.');
    authStore.logout(); // Deep logout handles clean redirect via page reload
    return false;
  }
  
  // 3. Preventative cleaning for direct access to /login
  if (to.path === '/login') {
    if (authStore.user) {
      if (_from.name) {
        logger.info('Router', 'Usuario logueado intentando entrar a /login vía gestos/historial. Redirigiendo al juego.');
        return '/';
      }
      logger.warn('Router', 'Usuario logueado intentando entrar a /login de forma directa. Forzando logout limpio.');
      authStore.logout(); // Deep logout handles clean redirect via page reload
      return true;
    } else {
      safeStorage.removeItem('pokevicio_local_user');
      safeStorage.removeItem('pokevicio_session_mode');
    }
  }
  
  // 4. Auth guard for protected routes
  if (to.meta.requiresAuth && !authStore.user) {
    return '/login';
  }
  
  return true;
})

export default router
