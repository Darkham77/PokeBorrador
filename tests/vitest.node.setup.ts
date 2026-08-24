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
