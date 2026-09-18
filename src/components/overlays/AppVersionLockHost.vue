<script setup lang="ts">
import { computed } from 'vue'
import VersionLockOverlay from './VersionLockOverlay.vue'

interface Props {
  dbIncompatible: boolean
  appIncompatible: boolean
  dbVersionInfo?: { client?: string | number; db?: string | number } | null
  appVersionInfo?: { client?: string | number; server?: string | number } | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'retry'): void
  (e: 'logout'): void
}>()

const activeLock = computed(() => {
  if (props.dbIncompatible) {
    return {
      type: 'database' as const,
      clientVersion: props.dbVersionInfo?.client,
      targetVersion: props.dbVersionInfo?.db
    }
  }
  if (props.appIncompatible) {
    return {
      type: 'server' as const,
      clientVersion: props.appVersionInfo?.client,
      targetVersion: props.appVersionInfo?.server
    }
  }
  return null
})
</script>

<template>
  <Teleport
    v-if="activeLock"
    to="body"
  >
    <VersionLockOverlay
      :client-version="activeLock.clientVersion"
      :target-version="activeLock.targetVersion"
      :lock-type="activeLock.type"
      @retry="emit('retry')"
      @logout="emit('logout')"
    />
  </Teleport>
</template>
