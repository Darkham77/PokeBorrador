/**
 * src/views/auth/useLoginHandlers.ts
 *
 * SRP Composable for handling login, registration, and local session workflows in LoginView.
 */

import { type Ref } from 'vue';
import type { Router } from 'vue-router';
import { validateAuthLogin, validateAuthRegister, validateTrainerName } from '@/logic/validation/schemas';
import { OFFICIAL_SERVERS } from '@/data/system/official_servers';
import type { useAuthStore } from '@/stores/auth';

export interface UseLoginHandlersParams {
  authStore: ReturnType<typeof useAuthStore>;
  router: Router;
  email: Ref<string>;
  password: Ref<string>;
  username: Ref<string>;
  gender: Ref<'h' | 'm'>;
  selectedServerId: Ref<string>;
  serverStatus: Ref<'checking' | 'online' | 'offline'>;
  serverStatusDetail: Ref<string>;
  error: Ref<string | null>;
  success: Ref<string | null>;
  loading: Ref<boolean>;
  authTab: Ref<string>;
  getFriendlyErrorMessage: (err: unknown) => string;
}

export function useLoginHandlers(params: UseLoginHandlersParams) {
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
    getFriendlyErrorMessage,
  } = params;

  const handleLogin = async () => {
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
      error.value = getFriendlyErrorMessage(err);
    } finally {
      loading.value = false;
    }
  };

  const handleSignup = async () => {
    const validRes = validateAuthRegister({
      email: email.value,
      password: password.value,
      username: username.value,
      gender: gender.value,
    });
    if (!validRes.success) {
      error.value = validRes.issues[0]?.message || 'Datos de registro inválidos';
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      await authStore.signup(validRes.output.email, validRes.output.password, validRes.output.username, validRes.output.gender || 'h');
      success.value = '¡Cuenta creada! Revisa tu email para confirmar.';
      authTab.value = 'login';
    } catch (err: unknown) {
      error.value = (err as Error).message || 'Error al registrarse';
    } finally {
      loading.value = false;
    }
  };

  const handleLocalLogin = async () => {
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
    } catch (_err) {
      error.value = 'Error al entrar en modo local';
    } finally {
      loading.value = false;
    }
  };

  const handleLocalSignup = async () => {
    const validName = validateTrainerName(username.value);
    if (!validName.success) {
      error.value = validName.issues[0]?.message || 'Ingresa un nickname válido';
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      await authStore.localLogin(validName.output, gender.value);
      const targetUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
      window.location.replace(targetUrl.href);
    } catch (_err) {
      error.value = 'Error al crear partida local';
    } finally {
      loading.value = false;
    }
  };

  const checkServerHealth = async () => {
    if (typeof window !== 'undefined' && '__E2E__' in window && Boolean((window as Window & { __E2E__?: boolean }).__E2E__)) {
      serverStatus.value = 'offline';
      serverStatusDetail.value = 'Offline E2E session';
      return;
    }

    if (!authStore.isOnline) {
      serverStatus.value = 'offline';
      return;
    }

    const server = OFFICIAL_SERVERS.find(s => s.id === selectedServerId.value);
    if (!server) return;

    serverStatus.value = 'checking';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${server.url}/rest/v1/`, {
        signal: controller.signal,
        headers: { 'apikey': server.anonKey },
      });

      clearTimeout(timeout);

      serverStatus.value = response.status < 500 ? 'online' : 'offline';
      serverStatusDetail.value = response.status < 500 ? 'Operativo ✅' : 'Error de Servidor 💥';
    } catch (_e) {
      serverStatus.value = 'offline';
      serverStatusDetail.value = 'Inalcanzable 💤';
    }
  };

  return {
    handleLogin,
    handleSignup,
    handleLocalLogin,
    handleLocalSignup,
    checkServerHealth,
  };
}
