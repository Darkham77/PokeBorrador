/**
 * src/views/auth/useLoginHandlers.ts
 *
 * SRP Composable for handling login, registration, and local session workflows in LoginView.
 */

import { type Ref } from 'vue';
import type { Router } from 'vue-router';

import { OFFICIAL_SERVERS_BY_ID } from '@/data/system/official_servers';
import { logger } from '@/logic/utils/logger';
import {
  validateAuthLogin,
  validateAuthRegister,
  validateTrainerName
} from '@/logic/validation/schemas';
import type { useAuthStore } from '@/stores/auth';
import type { ServerConnectionStatus } from '@/types/auth/auth';
import type { GenderId } from '@/types/system/game';

const SERVER_HEALTH_TIMEOUT_MS = 3000;

export type AuthGender = GenderId;
export type AuthServerStatus = ServerConnectionStatus;

export interface UseLoginHandlersParams {
  authStore: ReturnType<typeof useAuthStore>;
  router: Router;
  email: Ref<string>;
  password: Ref<string>;
  username: Ref<string>;
  gender: Ref<AuthGender>;
  selectedServerId: Ref<string>;
  serverStatus: Ref<AuthServerStatus>;
  serverStatusDetail: Ref<string>;
  error: Ref<string | null>;
  success: Ref<string | null>;
  loading: Ref<boolean>;
  authTab: Ref<string>;
  getFriendlyErrorMessage: (err: unknown) => string;
}

export function useLoginHandlers(params: UseLoginHandlersParams): {
  handleLogin: () => Promise<void>;
  handleSignup: () => Promise<void>;
  handleLocalLogin: () => Promise<void>;
  handleLocalSignup: () => Promise<void>;
  checkServerHealth: () => Promise<void>;
} {
  const {
    authStore,
    router,
    email,
    password,
    username,
    gender,
    selectedServerId,
    serverStatus,
    serverStatusDetail,
    error,
    success,
    loading,
    authTab,
    getFriendlyErrorMessage
  } = params;

  const handleLogin = async (): Promise<void> => {
    if (serverStatus.value !== 'online') return;
    const validRes = validateAuthLogin({ email: email.value, password: password.value });
    if (!validRes.success) {
      error.value = validRes.issues[0]?.message || 'Credenciales inválidas';
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      await authStore.login(validRes.output.email, validRes.output.password);
      await router.replace('/');
    } catch (err: unknown) {
      logger.error('Auth', 'Error técnico al iniciar sesión (handleLogin):', err);
      error.value = getFriendlyErrorMessage(err);
    } finally {
      loading.value = false;
    }
  };

  const handleSignup = async (): Promise<void> => {
    const validRes = validateAuthRegister({
      email: email.value,
      password: password.value,
      username: username.value,
      gender: gender.value
    });
    if (!validRes.success) {
      error.value = validRes.issues[0]?.message || 'Datos de registro inválidos';
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      await authStore.signup(
        validRes.output.email,
        validRes.output.password,
        validRes.output.username,
        validRes.output.gender || 'h'
      );
      success.value = '¡Cuenta creada! Revisa tu email para confirmar.';
      authTab.value = 'login';
    } catch (err: unknown) {
      logger.error('Auth', 'Error técnico al registrar usuario (handleSignup):', err);
      error.value = (err as Error).message || 'Error al registrarse';
    } finally {
      loading.value = false;
    }
  };

  const handleLocalLogin = async (): Promise<void> => {
    const validName = validateTrainerName(username.value);
    if (!validName.success) {
      error.value = validName.issues[0]?.message || 'Ingresa un nickname válido';
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      await authStore.localLogin(validName.output);
      await router.replace('/');
    } catch (err) {
      logger.error('Auth', 'Error técnico al entrar en modo local (handleLocalLogin):', err);
      error.value = 'Error al entrar en modo local';
    } finally {
      loading.value = false;
    }
  };

  const handleLocalSignup = async (): Promise<void> => {
    const validName = validateTrainerName(username.value);
    if (!validName.success) {
      error.value = validName.issues[0]?.message || 'Ingresa un nickname válido';
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      await authStore.localLogin(validName.output, gender.value);
      const targetUrl = new URL(import.meta.env.BASE_URL, globalThis.location.origin);
      // fallow-ignore-next-line security-sink
      globalThis.location.replace(targetUrl.href);
    } catch (err) {
      logger.error('Auth', 'Error técnico al crear partida local (handleLocalSignup):', err);
      error.value = 'Error al crear partida local';
    } finally {
      loading.value = false;
    }
  };

  const checkServerHealth = async (): Promise<void> => {
    if (typeof globalThis.window !== 'undefined' && Boolean(globalThis.window.__E2E__)) {
      serverStatus.value = 'offline';
      serverStatusDetail.value = 'Offline E2E session';
      return;
    }

    if (!authStore.isOnline) {
      serverStatus.value = 'offline';
      return;
    }

    const server = OFFICIAL_SERVERS_BY_ID[selectedServerId.value];
    if (!server) return;

    serverStatus.value = 'checking';
    try {
      // fallow-ignore-next-line security-sink
      const response = await fetch(`${server.url}/rest/v1/`, {
        signal: AbortSignal.timeout(SERVER_HEALTH_TIMEOUT_MS),
        headers: { apikey: server.anonKey }
      });

      serverStatus.value = response.status < 500 ? 'online' : 'offline';
      serverStatusDetail.value = response.status < 500 ? 'Operativo ✅' : 'Error de Servidor 💥';
    } catch {
      serverStatus.value = 'offline';
      serverStatusDetail.value = 'Inalcanzable 💤';
    }
  };

  return {
    handleLogin,
    handleSignup,
    handleLocalLogin,
    handleLocalSignup,
    checkServerHealth
  };
}
