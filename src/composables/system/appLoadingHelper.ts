export interface AppLoadingState {
  active: boolean;
  msg: string;
  sub: string;
  global: boolean;
  icon: string;
}

export interface ResolveLoadingParams {
  loadingStoreActive: boolean;
  loadingStoreCurrent?: { message?: string; subMessage?: string; isGlobal?: boolean; icon?: string } | null;
  authLoading: boolean;
  hasUser: boolean;
  isLoginPage: boolean;
  isStandaloneDevPage: boolean;
  isDataLoaded: boolean;
  isEngineReady: boolean;
  isOverlayLoading?: boolean;
  overlayMessage?: string;
}

export function resolveAppLoadingInfo(params: ResolveLoadingParams): AppLoadingState {
  if (params.loadingStoreActive) {
    const cur = params.loadingStoreCurrent;
    return {
      active: true,
      msg: cur?.message || 'Cargando...',
      sub: cur?.subMessage || '',
      global: cur?.isGlobal || false,
      icon: cur?.icon || '📶'
    };
  }

  if (params.authLoading) {
    return {
      active: true,
      msg: 'Iniciando sesión...',
      sub: 'Conectando con el servidor',
      global: false,
      icon: '📶'
    };
  }

  if (params.hasUser && !params.isLoginPage && !params.isStandaloneDevPage && (!params.isDataLoaded || !params.isEngineReady)) {
    return {
      active: true,
      msg: !params.isDataLoaded ? 'Cargando datos...' : 'Iniciando motor...',
      sub: 'Preparando entorno de juego',
      global: false,
      icon: !params.isDataLoaded ? '📂' : '⚙️'
    };
  }

  if (params.isOverlayLoading) {
    return {
      active: true,
      msg: params.overlayMessage || 'Procesando...',
      sub: 'Por favor, no cierres la ventana',
      global: true,
      icon: '⏳'
    };
  }

  return { active: false, msg: '', sub: '', global: false, icon: '📶' };
}

export interface ShouldShowLoadingOverlayParams {
  updateModalType: string | null;
  isStandaloneDevPage: boolean;
  isUpdateAvailable: boolean;
  hasUser: boolean;
  isLoginPage: boolean;
  loadingActive: boolean;
  gameReady: boolean;
  isGateOpen: boolean;
}

export function shouldShowLoadingOverlay(params: ShouldShowLoadingOverlayParams): boolean {
  if (params.updateModalType === 'db_outdated' || params.updateModalType === 'server_outdated') {
    return false;
  }
  if (params.isStandaloneDevPage) {
    return false;
  }
  if (params.isUpdateAvailable && params.hasUser) {
    return true;
  }
  if (params.isLoginPage) {
    return params.loadingActive;
  }
  if (params.hasUser) {
    return !params.gameReady || !params.isGateOpen;
  }
  return !params.isGateOpen;
}

export function resolveUpdateOverlayMessage(isGameReady: boolean): string {
  return isGameReady
    ? '¡Hay una nueva versión disponible! Para evitar la corrupción de datos en tu partida guardada, debes cerrar tu sesión e instalar la actualización de forma segura desde la pantalla de inicio.'
    : '¡Hay una nueva versión disponible! Es necesario cerrar tu sesión para poder instalarla y mantener la compatibilidad con el servidor.';
}
