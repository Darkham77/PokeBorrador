import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { logger } from '@/logic/utils/logger'
import { safeStorage } from '@/logic/utils/storage'
import { resilientRouteComponent } from '@/logic/utils/resilientComponent'
import LoginView from '@/views/auth/LoginView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },


    {
      path: '/',
      alias: '/game',
      component: resilientRouteComponent(() => import('@/views/game/GameView.vue')),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'map',
          component: resilientRouteComponent(() => import('@/views/game/MapView.vue')),
        },
        // {
        //   path: 'team',
        //   name: 'team',
        //   component: () => import('@/views/TeamView.vue'),
        // },
        {
          path: 'pokedex',
          name: 'pokedex',
          component: resilientRouteComponent(() => import('@/views/pokemon/PokedexView.vue')),
        },
        {
          path: 'social',
          name: 'social',
          component: resilientRouteComponent(() => import('@/views/social/SocialView.vue')),
        },
        {
          path: 'bag',
          name: 'bag',
          component: resilientRouteComponent(() => import('@/views/inventory/BagView.vue')),
        }
      ]
    },
    {
      path: '/test-aventura',
      name: 'test-aventura',
      component: resilientRouteComponent(() => import('@/views/adventure/AdventureTestView.vue'))
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

router.onError((error, to) => {
  const msg = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
  const isChunkError = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk|Couldn't resolve component/i.test(msg);
  if (isChunkError) {
    logger.warn('Router', `Fallo al cargar módulo/chunk dinámico hacia ${to?.fullPath || 'ruta'}. Emitiendo PWA_NEED_REFRESH...`);
    import('@/logic/events/gameBus.ts').then(({ gameBus }) => {
      gameBus.emit('PWA_NEED_REFRESH');
    });
  }
})

export default router
