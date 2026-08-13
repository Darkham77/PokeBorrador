# **Arquitectura de Sincronización Inmediata de Versiones y Control de Caché PWA en Aplicaciones Vue 3 y Workbox**

El desarrollo de aplicaciones web progresivas (PWA) orientadas a videojuegos en tiempo real con persistencia distribuida plantea retos significativos en la gestión del ciclo de vida del Service Worker y en la sincronización de almacenamiento en el navegador1. En arquitecturas donde coexisten un backend con esquemas relacionales cambiantes (Supabase) y almacenamiento local fuera de línea (SQLite con OPFS) coordinados por una capa de enrutamiento de datos (DBRouter), la ejecución de bundles JavaScript obsoletos compromete la integridad del estado del juego y provoca fallos críticos durante la persistencia de datos3.  
A continuación se presenta una investigación exhaustiva de las causas raíz de la persistencia de caché obsoleto, la especificación de cabeceras HTTP de servidor/CDN, el protocolo de purga selectiva de caché y la implementación completa del sistema en TypeScript y Vue 3\.

## **Análisis Técnico y Causa Raíz de la Persistencia de Caché Obsoleto**

La incapacidad de una PWA para servirse de las versiones más recientes de sus bundles tras un despliegue en servidor responde a una interacción defectuosa entre el ciclo de vida del Service Worker, la gestión del HTTP Cache del navegador y las condiciones de carrera en el intercambio de controladores del hilo principal3.

### **Bloqueo en el Ciclo de Vida del Service Worker**

Cuando vite-plugin-pwa se configura con registerType: 'prompt' y skipWaiting: false, la detección de un nuevo archivo sw.js en el servidor hace que el navegador descargue e instale el nuevo Service Worker, ubicándolo en una fase de espera denominada installed/waiting3. En este estado, el nuevo Service Worker no asume el control de la aplicación hasta que todas las pestañas abiertas bajo el mismo origen sean cerradas o hasta que se envíe explícitamente el mensaje SKIP\_WAITING a la instancia en espera3.  
Si la aplicación invoca un refresco de página mediante window.location.reload() o window.location.replace() sin activar previamente dicho Service Worker en espera, el navegador ejecuta la solicitud de navegación manteniendo el Service Worker antiguo como controlador activo (navigator.serviceWorker.controller)3. El Service Worker antiguo intercepta la petición de index.html y la resuelve desde su propio contenedor de precaché (workbox-precache-\*), lo que resulta en un bucle donde el cliente vuelve a cargar exactamente los mismos bundles obsoletos4.

### **Interferencia de Cabeceras HTTP Cache**

El proceso de verificación de actualizaciones del Service Worker se ve directamente afectado por las directivas HTTP del servidor web o la red de distribución de contenidos (CDN)5:

* **Almacenamiento en Caché del Script sw.js**: Si el servidor responde a las peticiones de sw.js con cabeceras de almacenamiento persistente (por ejemplo, Cache-Control: max-age=86400), el navegador no consulta a la red para verificar cambios byte por byte en el script del Service Worker durante las llamadas a registration.update()5.  
* **Caché en Disco de index.html**: Si el archivo de entrada index.html se almacena en el caché de disco del navegador sin validación previa, la PWA continuará solicitando los nombres de bundles JS compilados anteriormente (index-A1B2C3.js), imposibilitando el enlace con las nuevas rutas generadas por Vite.  
* **Peticiones HTTP para version.json**: Las comprobaciones periódicas de versión en segundo plano leen respuestas obsoletas de la caché HTTP local en lugar de obtener la respuesta real de la red cuando no se configuran parámetros de invalidación explícitos.

### **Condiciones de Carrera entre SKIP\_WAITING, clientsClaim y el Evento Reload**

La activación directa de SKIP\_WAITING rompe la garantía de aislamiento del Service Worker7. Si el cliente envía la orden { type: 'SKIP\_WAITING' } a la instancia en espera e inmediatamente llama a window.location.reload(), se origina una condición de carrera:

* El nuevo Service Worker activa sus escuchadores y reclama los clientes mediante clientsClaim(), pero el proceso de activación y la ejecución de cleanupOutdatedCaches ocurren de forma asíncrona en un hilo secundario1.  
* Si el refresco del DOM se ejecuta antes de que el evento controllerchange haya finalizado y el nuevo controlador esté completamente asentado, la nueva solicitud de navegación puede ser atendida por la caché residual o por hilos en proceso de terminación, resultando en errores de red o carga de activos inconsistentes6.

## **Especificación de Cabeceras HTTP y Servidor CDN**

Para garantizar que el navegador descargue de manera inmediata las definiciones de la PWA manteniendo un rendimiento óptimo en la entrega de activos pesados, se define la siguiente especificación de cabeceras HTTP Cache-Control:

| Patrón de Recurso | Estrategia de Caché | Cabecera HTTP Cache-Control | Propósito Técnico |
| :---- | :---- | :---- | :---- |
| /sw.js | Sin Caché (Red Directa) | no-cache, no-store, must-revalidate, max-age=0 | Fuerza al navegador a verificar cambios byte por byte en el script del Service Worker en cada consulta. |
| /index.html | Revalidación Obligatoria | no-cache, must-revalidate, max-age=0 | Permite almacenar en caché local pero exige revalidar ETag/Last-Modified con el servidor antes de servir el documento. |
| /version.json | Sin Caché (Red Directa) | no-cache, no-store, must-revalidate, max-age=0 | Garantiza que las verificaciones en segundo plano lean la versión real desplegada en la base de datos y el servidor. |
| /assets/\*.js, /assets/\*.css | Inmutable (Hash en Nombre) | public, max-age=31536000, immutable | Caché agresiva de un año. La modificación del contenido altera el hash del nombre del archivo, invalidando la URL. |
| /assets/media/\* (PNG, WebP, MP3) | Revalidación Diferida | public, max-age=7776000, stale-while-revalidate=86400 | Reutilización de gráficos y audios pesados por 90 días, actualizando el contenedor en segundo plano tras expirar la revalidación. |

## **Protocolo de Intercepción de Guardado y Protección de Estado**

Cuando el servidor Supabase o la verificación de compatibilidad en DBRouter devuelve la excepción OUTDATED\_CLIENT, la arquitectura debe impedir la ejecución de cualquier instrucción de escritura adicional hacia la base de datos local o remota.

### **Flujo de Aislamiento de Persistencia**

> 1. **Captura de Excepción en la Capa de Datos**: La capa DBRouter o las acciones de guardado (saveActions.ts) evalúan la compatibilidad entre la constante \_\_APP\_VERSION\_\_ y el registro de la tabla system\_config.app\_version o el archivo version.json.  
> 2. **Rechazo Atómico de Transacción**: Si se detecta un cliente desactualizado, el pipeline de guardado aborta la operación inmediatamente arrojando una excepción personalizada de tipo OutdatedClientError, bloqueando el envío de peticiones RPC a Supabase o transacciones en SQLite.  
> 3. **Notificación Centralizada**: La excepción dispara un estado global en Pinia (systemStore.isOutdated \= true), inhabilitando los temporizadores de autoguardado en segundo plano y desconectando las suscripciones en tiempo real.  
> 4. **Activación de Modal Bloqueante**: La interfaz presenta una superposición modal no descartable (pointer-events: all, z-index: 999999\) que impide cualquier interacción del usuario con el lienzo del juego o los menús.

## **Protocolo Atómico de Purga de Caché y Reemplazo de Controlador**

Para efectuar un salto de versión garantizado sin forzar la descarga de los paquetes de gráficos y sonido almacenados en la caché en tiempo de ejecución, la aplicación debe ejecutar la siguiente secuencia ordenada:

> 1. **Desconexión Limpia de Sesión**: Cancelación de temporizadores, cierre de sockets en tiempo real y persistencia limpia de tokens de autenticación para un rápido reinicio.  
> 2. **Activación del Worker en Espera**: Envío del mensaje { type: 'SKIP\_WAITING' } al Service Worker ubicado en registration.waiting.  
> 3. **Suscripción al Cambio de Controlador**: Registro de un escuchador único sobre el evento controllerchange en navigator.serviceWorker5. La purga de datos y la recarga del documento se posponen hasta que este evento se emita formalmente5.  
> 4. **Purga Selectiva de CacheStorage**: Inspección iterativa mediante caches.keys(). Se eliminan los contenedores pertenecientes a precachés obsoletos (workbox-precache-\*), preservando intactos los buckets de recursos pesados (game-images-v1 y game-audio-v1)1.  
> 5. **Navegación con Invalidation Query**: Ejecución de window.location.replace(window.location.origin \+ window.location.pathname \+ '?v=' \+ Date.now()) para ignorar la memoria caché del navegador en el nivel de documento HTML.

## **Receta de Implementación y Código de Producción**

### **1\. Configuración de Vite y Workbox (vite.config.ts)**

Esta configuración establece la gestión de registros del Service Worker, la invalidación de caché HTTP en la verificación de Service Workers mediante updateViaCache: 'none', y las reglas de almacenamiento en tiempo de ejecución para activos pesados3.

TypeScript  
import { defineConfig } from 'vite';  
import vue from '@vitejs/plugin-vue';  
import { VitePWA } from 'vite-plugin-pwa';  
import { resolve } from 'path';

export default defineConfig({  
  define: {  
    \_\_APP\_VERSION\_\_: JSON.stringify(\`v${new Date().toISOString().replace(/\[-:T.\]/g, '').slice(0, 12)}\`)  
  },  
  plugins: \[  
    vue(),  
    VitePWA({  
      registerType: 'prompt',  
      injectRegister: 'auto',  
      workbox: {  
        cleanupOutdatedCaches: true,  
        skipWaiting: false,  
        clientsClaim: true,  
        updateViaCache: 'none',  
        globPatterns: \['\*\*/\*.{js,css,html,ico,woff2,wasm}'\],  
        maximumFileSizeToCacheInBytes: 8 \* 1024 \* 1024,  
        navigateFallback: '/index.html',  
        runtimeCaching: \[  
          {  
            urlPattern: /\\/assets\\/.\*\\.(png|webp|svg|gif|jpg|jpeg)(\\?.\*)?$/i,  
            handler: 'CacheFirst',  
            options: {  
              cacheName: 'game-images-v1',  
              expiration: {  
                maxEntries: 25000,  
                maxAgeSeconds: 60 \* 60 \* 24 \* 90  
              },  
              cacheableResponse: {  
                statuses: \[0, 200\]  
              }  
            }  
          },  
          {  
            urlPattern: /\\/assets\\/.\*\\.(mp3|ogg|wav|mid|midi|m4a|flac|aac)(\\?.\*)?$/i,  
            handler: 'CacheFirst',  
            options: {  
              cacheName: 'game-audio-v1',  
              expiration: {  
                maxEntries: 500,  
                maxAgeSeconds: 60 \* 60 \* 24 \* 90  
              },  
              cacheableResponse: {  
                statuses: \[0, 200\]  
              }  
            }  
          }  
        \]  
      }  
    })  
  \]  
});

### **2\. Composable de Control y Registro PWA (src/composables/usePWA.ts)**

Composable especializado que encapsula el registro del Service Worker, la verificación periódica de actualizaciones, la purga selectiva de cachés y la reorientación atómica de la ventana5.

TypeScript  
import { ref, onMounted, onUnmounted } from 'vue';  
import { registerSW } from 'virtual:pwa-register';

const PRESERVED\_CACHE\_REGEXP \= /^game-(images|audio)-v\\d+$/i;

export function usePWA() {  
  const needRefresh \= ref(false);  
  const offlineReady \= ref(false);  
  const isUpdating \= ref(false);  
  let updateIntervalId: number | undefined;

  const purgeCodeCaches \= async (): Promise\<void\> \=\> {  
    if (\!('caches' in window)) return;  
    try {  
      const cacheKeys \= await caches.keys();  
      await Promise.all(  
        cacheKeys.map((key) \=\> {  
          if (PRESERVED\_CACHE\_REGEXP.test(key)) {  
            return Promise.resolve(false);  
          }  
          return caches.delete(key);  
        })  
      );  
    } catch (error) {  
      console.error('\[PWA\] Error durante la purga de CacheStorage:', error);  
    }  
  };

  const executeForceUpdate \= async (): Promise\<void\> \=\> {  
    if (isUpdating.value) return;  
    isUpdating.value \= true;

    try {  
      if ('serviceWorker' in navigator) {  
        const registration \= await navigator.serviceWorker.getRegistration();

        if (registration && registration.waiting) {  
          const controllerChangePromise \= new Promise\<void\>((resolve) \=\> {  
            const onChange \= () \=\> {  
              navigator.serviceWorker.removeEventListener('controllerchange', onChange);  
              resolve();  
            };  
            navigator.serviceWorker.addEventListener('controllerchange', onChange);  
          });

          registration.waiting.postMessage({ type: 'SKIP\_WAITING' });

          await Promise.race(\[  
            controllerChangePromise,  
            new Promise((resolve) \=\> setTimeout(resolve, 3500))  
          \]);  
        }  
      }

      await purgeCodeCaches();

      const targetUrl \= new URL(window.location.href);  
      targetUrl.searchParams.set('reload\_t', Date.now().toString());  
      window.location.replace(targetUrl.toString());  
    } catch (err) {  
      console.error('\[PWA\] Fallo en la actualización forzada:', err);  
      window.location.reload();  
    }  
  };

  onMounted(() \=\> {  
    registerSW({  
      immediate: true,  
      onNeedRefresh() {  
        needRefresh.value \= true;  
      },  
      onOfflineReady() {  
        offlineReady.value \= true;  
      },  
      onRegisterError(error) {  
        console.error('\[PWA\] Error registrando el Service Worker:', error);  
      }  
    });

    updateIntervalId \= window.setInterval(async () \=\> {  
      if ('serviceWorker' in navigator && navigator.onLine) {  
        const reg \= await navigator.serviceWorker.getRegistration();  
        if (reg) {  
          await reg.update();  
        }  
      }  
    }, 5 \* 60 \* 1000);  
  });

  onUnmounted(() \=\> {  
    if (updateIntervalId \!== undefined) {  
      clearInterval(updateIntervalId);  
    }  
  });

  return {  
    needRefresh,  
    offlineReady,  
    isUpdating,  
    executeForceUpdate  
  };  
}

### **3\. Interceptor de Guardado y Verificación de Compatibilidad (src/services/saveInterceptor.ts)**

Módulo encargado de evaluar la versión del cliente frente al servidor en cada intento de guardado, previniendo escrituras incompatibles.

TypeScript  
import { useSystemStore } from '../stores/systemStore';

declare const \_\_APP\_VERSION\_\_: string;

export class OutdatedClientError extends Error {  
  constructor(message \= 'OUTDATED\_CLIENT') {  
    super(message);  
    this.name \= 'OutdatedClientError';  
  }  
}

interface ServerVersionPayload {  
  version: string;  
  minCompatibleVersion?: string;  
}

export async function fetchServerVersion(): Promise\<string | null\> {  
  try {  
    const response \= await fetch(\`/version.json?nc=${Date.now()}\`, {  
      headers: {  
        'Cache-Control': 'no-cache, no-store, must-revalidate',  
        'Pragma': 'no-cache'  
      }  
    });

    if (\!response.ok) return null;

    const data: ServerVersionPayload \= await response.json();  
    return data.version || null;  
  } catch (error) {  
    console.warn('\[VersionCheck\] No se pudo obtener la versión del servidor:', error);  
    return null;  
  }  
}

export async function checkAppVersionCompatibility(): Promise\<boolean\> {  
  const systemStore \= useSystemStore();  
  const serverVersion \= await fetchServerVersion();

  if (serverVersion && serverVersion \!== \_\_APP\_VERSION\_\_) {  
    systemStore.setOutdatedState(serverVersion);  
    return false;  
  }  
  return true;  
}

export async function executeProtectedSave\<T\>(saveOperation: () \=\> Promise\<T\>): Promise\<T\> {  
  const systemStore \= useSystemStore();

  if (systemStore.isOutdated) {  
    throw new OutdatedClientError('Guardado abortado: El cliente está desactualizado.');  
  }

  const isCompatible \= await checkAppVersionCompatibility();  
  if (\!isCompatible) {  
    throw new OutdatedClientError('Guardado abortado: Se detectó una versión más reciente en el servidor.');  
  }

  try {  
    return await saveOperation();  
  } catch (error: any) {  
    if (error?.message?.includes('OUTDATED\_CLIENT') || error?.code \=== 'OUTDATED\_CLIENT') {  
      systemStore.setOutdatedState();  
      throw new OutdatedClientError();  
    }  
    throw error;  
  }  
}

### **4\. Componente Principal y Modal Bloqueante (src/App.vue)**

Vista principal que integra el estado del sistema, intercepta la señal de refresco y presenta la interfaz modal bloqueante.

Fragmento de código  
\<script setup lang="ts"\>  
import { watch } from 'vue';  
import { usePWA } from './composables/usePWA';  
import { useSystemStore } from './stores/systemStore';

const systemStore \= useSystemStore();  
const { needRefresh, isUpdating, executeForceUpdate } \= usePWA();

watch(needRefresh, (isNeeded) \=\> {  
  if (isNeeded) {  
    systemStore.setOutdatedState();  
  }  
});

const handleForcedUpdateTrigger \= async () \=\> {  
  await systemStore.terminateSessionAndCleanup();  
  await executeForceUpdate();  
};  
\</script\>

\<template\>  
  \<div id="app-container"\>  
    \<router-view /\>

    \<Transition name="modal-fade"\>  
      \<div   
        v-if="systemStore.isOutdated"   
        class="version-overlay-backdrop"  
        role="dialog"  
        aria-modal="true"  
        aria-labelledby="modal-title"  
      \>  
        \<div class="version-modal-card"\>  
          \<div class="modal-header"\>  
            \<h2 id="modal-title"\>Actualización Servidor Requerida\</h2\>  
          \</div\>  
            
          \<div class="modal-body"\>  
            \<p\>  
              Se ha detectado una nueva versión del juego en el servidor.   
              Para evitar la corrupción de tus datos de guardado, la sesión actual ha sido pausada.  
            \</p\>

            \<div class="version-badge" v-if="systemStore.latestServerVersion"\>  
              \<span\>Nueva versión: \<code\>{{ systemStore.latestServerVersion }}\</code\>\</span\>  
            \</div\>  
          \</div\>

          \<div class="modal-footer"\>  
            \<button   
              class="btn-action-update"   
              :disabled="isUpdating"  
              @click="handleForcedUpdateTrigger"  
            \>  
              \<span v-if="\!isUpdating"\>Recargar y Actualizar Ahora\</span\>  
              \<span v-else class="status-loading"\>  
                Aplicando actualización de Service Worker...  
              \</span\>  
            \</button\>  
          \</div\>  
        \</div\>  
      \</div\>  
    \</Transition\>  
  \</div\>  
\</template\>

\<style scoped\>  
.version-overlay-backdrop {  
  position: fixed;  
  inset: 0;  
  background-color: rgba(6, 9, 15, 0.94);  
  backdrop-filter: blur(10px);  
  z-index: 999999;  
  display: flex;  
  align-items: center;  
  justify-content: center;  
  padding: 1rem;  
  pointer-events: all;  
}

.version-modal-card {  
  background: \#111827;  
  border: 1px solid \#1f2937;  
  border-radius: 12px;  
  padding: 2rem;  
  max-width: 440px;  
  width: 100%;  
  box-shadow: 0 25px 50px \-12px rgba(0, 0, 0, 0.7);  
  color: \#f9fafb;  
  text-align: center;  
}

.modal-header h2 {  
  font-size: 1.35rem;  
  font-weight: 700;  
  color: \#f59e0b;  
  margin-bottom: 1rem;  
}

.modal-body p {  
  font-size: 0.925rem;  
  line-height: 1.6;  
  color: \#9ca3af;  
  margin-bottom: 1.25rem;  
}

.version-badge {  
  background-color: \#1e293b;  
  border: 1px solid \#334155;  
  border-radius: 6px;  
  padding: 0.5rem;  
  margin-bottom: 1.5rem;  
  font-size: 0.85rem;  
}

code {  
  color: \#38bdf8;  
  font-family: monospace;  
}

.btn-action-update {  
  width: 100%;  
  padding: 0.85rem 1.25rem;  
  background-color: \#2563eb;  
  color: \#ffffff;  
  font-weight: 600;  
  border: none;  
  border-radius: 6px;  
  cursor: pointer;  
  transition: background-color 0.2s ease;  
}

.btn-action-update:hover:not(:disabled) {  
  background-color: \#1d4ed8;  
}

.btn-action-update:disabled {  
  opacity: 0.6;  
  cursor: wait;  
}

.status-loading {  
  display: inline-flex;  
  align-items: center;  
  gap: 0.5rem;  
}

.modal-fade-enter-active,  
.modal-fade-leave-active {  
  transition: opacity 0.25s ease;  
}

.modal-fade-enter-from,  
.modal-fade-leave-to {  
  opacity: 0;  
}  
\</style\>

## **Conclusiones Arquitectónicas**

La solución integrada aborda de forma definitiva la persistencia de cachés obsoletos en la PWA mediante la articulación de tres mecanismos fundamentales:

> 1. **Garantía de Red HTTP**: La invalidación explícita de caché en las cabeceras del servidor (sw.js, index.html y version.json) anula la retención de archivos de entrada en el disco del navegador.  
> 2. **Sincronización Transicional del Service Worker**: La escucha del evento controllerchange tras el envío de SKIP\_WAITING asegura que la navegación hacia la nueva versión ocurra cuando el Service Worker actualizado controla efectivamente el canal de red5.  
> 3. **Preservación de Activos Pesados**: El filtrado por expresión regular durante la purga de CacheStorage destruye únicamente las entradas de código e interfaz (workbox-precache-\*), protegiendo los contenedores de medios (game-images-v1 y game-audio-v1) y minimizando el consumo de ancho de banda5.

#### **Fuentes citadas**

> 1. workbox-precaching | Modules \- Chrome for Developers, [https://developer.chrome.com/docs/workbox/modules/workbox-precaching](https://developer.chrome.com/docs/workbox/modules/workbox-precaching)  
> 2. Vite and Progressive Web Apps \- CODE Magazine, [https://www.codemag.com/Article/2309071/Vite-and-Progressive-Web-Apps](https://www.codemag.com/Article/2309071/Vite-and-Progressive-Web-Apps)  
> 3. Automatic reload | Guide \- Vite PWA \- Netlify, [https://vite-pwa-org.netlify.app/guide/auto-update](https://vite-pwa-org.netlify.app/guide/auto-update)  
> 4. Making a Site Work Offline Using the VitePWA Plugin \- CSS-Tricks, [https://css-tricks.com/vitepwa-plugin-offline-service-worker/](https://css-tricks.com/vitepwa-plugin-offline-service-worker/)  
> 5. Vite PWA auto update on page load, but perform regular update checks with user prompt, [https://stackoverflow.com/questions/77862021/vite-pwa-auto-update-on-page-load-but-perform-regular-update-checks-with-user-p](https://stackoverflow.com/questions/77862021/vite-pwa-auto-update-on-page-load-but-perform-regular-update-checks-with-user-p)  
> 6. Prompt for update doesn't reload page on first update · Issue \#789 · vite-pwa/vite-plugin-pwa, [https://github.com/vite-pwa/vite-plugin-pwa/issues/789](https://github.com/vite-pwa/vite-plugin-pwa/issues/789)  
> 7. Adding PWA update prompt in vite react \- Anil Kumar Soni, [https://anilsonix.com/posts/adding-pwa-update-prompt-in-vite-react/](https://anilsonix.com/posts/adding-pwa-update-prompt-in-vite-react/)  
> 8. PWA built with React \+ Vite, The APK doesn't auto-refresh \- Reddit, [https://www.reddit.com/r/PWA/comments/1lzd0ym/pwa\_built\_with\_react\_vite\_the\_apk\_doesnt/](https://www.reddit.com/r/PWA/comments/1lzd0ym/pwa_built_with_react_vite_the_apk_doesnt/)  
> 9. How do I use Workbox Range Requests plugin with Vite PWA? \- Stack Overflow, [https://stackoverflow.com/questions/76007716/how-do-i-use-workbox-range-requests-plugin-with-vite-pwa](https://stackoverflow.com/questions/76007716/how-do-i-use-workbox-range-requests-plugin-with-vite-pwa)