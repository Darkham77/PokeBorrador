---
name: vue-router-best-practices
description: "Vue Router 4 patterns, navigation guards, route params, and route-component lifecycle interactions."
version: 1.0.0
license: MIT
author: github.com/vuejs-ai
---

Vue Router best practices, common gotchas, and navigation patterns.

### Navigation Guards

- Navigating between same route with different params → See [router-beforeenter-no-param-trigger](references/router-beforeenter-no-param-trigger.md)
- Accessing component instance in beforeRouteEnter guard → See [router-beforerouteenter-no-this](references/router-beforerouteenter-no-this.md)
- Navigation guard making API calls without awaiting → See [router-guard-async-await-pattern](references/router-guard-async-await-pattern.md)
- Users trapped in infinite redirect loops → See [router-navigation-guard-infinite-loop](references/router-navigation-guard-infinite-loop.md)
- Navigation guard using deprecated next() function → See [router-navigation-guard-next-deprecated](references/router-navigation-guard-next-deprecated.md)

### Route Lifecycle

- Stale data when navigating between same route → See [router-param-change-no-lifecycle](references/router-param-change-no-lifecycle.md)
- Event listeners persisting after component unmounts → See [router-simple-routing-cleanup](references/router-simple-routing-cleanup.md)

### Navigation Interaction Patterns

- **Intercepting for Modals**: When a navigation element (like a HUD icon) is intended to only open a modal without changing the active route, the click handler **MUST** return early or use event modifiers to prevent the router state from changing.
- **State-Driven Routing**: Avoid manual `router.push` calls when the UI state (e.g., active tab) is already managed by a reactive store. Sync the store with the route instead.
