// Missing canonical header intentionally

export function runBadConsoleReporting(): void {
  // Trigger: naked-console-call
  console.log("Naked info logging without canonical logger");
  console.error("Naked error logging without canonical logger");
  console.warn("Naked warning logging without canonical logger");
}
