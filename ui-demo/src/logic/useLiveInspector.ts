import { ref } from 'vue'

export interface InspectorLogEntry {
  id: number
  time: string
  message: string
}

function getCurrentTimeString(): string {
  return Temporal.Now.plainTimeISO().toString().slice(0, 8)
}

const logs = ref<InspectorLogEntry[]>([
  {
    id: 1,
    time: getCurrentTimeString(),
    message: 'Sistema inicializado. Modifica cualquier input o interactúa con los paneles...'
  }
])

const serializedData = ref<Record<string, unknown>>({
  status: 'esperando_interaccion',
  nota: 'Cambia cualquier input o pulsa submit para serializar los datos en vivo.'
})

let nextLogId = 2 // singleton-ok: Module-level log ID incrementer

export function logToInspector(message: string): void {
  const time = getCurrentTimeString()
  logs.value.unshift({
    id: nextLogId++,
    time,
    message
  })
  if (logs.value.length > 50) {
    logs.value.pop()
  }
}

export function updateSerializedFormData(data: Record<string, unknown>): void {
  serializedData.value = { ...data }
}

export function clearInspectorLogs(): void {
  logs.value = []
  serializedData.value = {
    status: 'consola_limpia',
    timestamp: getCurrentTimeString()
  }
}

export function useLiveInspector() {
  return {
    logs,
    serializedData,
    log: logToInspector,
    updateSerialized: updateSerializedFormData,
    clear: clearInspectorLogs
  }
}
