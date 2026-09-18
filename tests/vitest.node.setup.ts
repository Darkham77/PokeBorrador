import { setupTestTeamGenerators, setupTemporalMock } from './helpers/setupTestEnvironment.ts'

setupTestTeamGenerators()

/**
 * tests/vitest.node.setup.ts
 * Global setup for Node.js environment Vitest tests.
 */
process.removeAllListeners('warning')
process.on('warning', (warning) => {
  if (warning.name === 'ExperimentalWarning' || warning.message?.includes('--localstorage-file')) {
    return
  }
  console.warn(warning.name, warning.message)
})

// Mock Temporal.Now to work with Vitest fake timers (which mock Date.now)
setupTemporalMock()

