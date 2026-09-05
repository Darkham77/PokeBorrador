/**
 * Mapeador de Errores Amigables para Poké Vicio
 * Transforma errores técnicos en mensajes con personalidad.
 */

import { logger } from './logger.ts';

export const getFriendlyErrorMessage = (error: unknown): string => {
  let message = '';
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    message = String(Reflect.get(error, 'message'));
  } else {
    message = String(error);
  }
  
  // 1. Errores de Conectividad (Sin Internet)
  if (!navigator.onLine) {
    return '¡No tienes conexión a Internet! Revisa tu señal 🌐';
  }

  // 2. Errores de Servidor Offline / Red
  if (message.includes('Failed to fetch') || message.includes('Network Error')) {
    return '¡Ups! El servidor está tomando una siesta (Offline) 💤';
  }

  if (message.includes('TIMEOUT')) {
    return 'El servidor está tardando mucho en responder... ⏳';
  }

  // 3. Errores de Autenticación
  if (message.includes('Invalid login credentials')) {
    return 'Email o contraseña incorrectos. ¡Inténtalo de nuevo! ❌';
  }

  if (message.includes('Email not confirmed')) {
    return 'Aún no has confirmado tu email. Revisa tu bandeja de entrada 📧';
  }

  // 4. Errores de Mantenimiento / 503
  const HTTP_SERVICE_UNAVAILABLE_STATUS_CODE = '503'
  if (message.includes(HTTP_SERVICE_UNAVAILABLE_STATUS_CODE) || message.includes('Service Unavailable')) {
    return 'Estamos curando a los Pokémon del servidor (Mantenimiento) 🚧';
  }

  // 5. Baneos (Ya manejados pero por si acaso)
  if (message.startsWith('BAN:')) {
    return `🚫 ACCESO DENEGADO: ${message.split(':')[1]}`;
  }

  // Fallback
  logger.error('FriendlyError', 'Error técnico no clasificado mostrado al usuario:', error);
  return 'Algo salió mal. Por favor, intenta de nuevo más tarde 🔧';
};
