# Purpose

General system maintenance scripts, import fixes, server configurations, and development plugins.

## Child DOX Index

- [admin_rename.ts](./admin_rename.ts): Utility script to rename trainer user identifiers.
- [admin_supabase_users.ts](./admin_supabase_users.ts): Cloud authentication user management.
- [audit_project.ts](./audit_project.ts): Full project codebase standards and DOX indexes validation pipeline. In `--fix` mode, runs `sass-migrator module --built-in-only` on any `.scss`/`.css` files with legacy `@import` found in scope. Requires `sass-migrator` installed globally (`npm install -g sass-migrator`).
- [configure_official_servers.ts](./configure_official_servers.ts): Builds official servers data configurations.
- [fix_node_timers_imports.ts](./fix_node_timers_imports.ts): Fixes Node timer prefix imports.
- [fix_vue_imports.ts](./fix_vue_imports.ts): Resolves Vue imports alias compatibility.
- [fix_vue_inline_imports.ts](./fix_vue_inline_imports.ts): Corrects inline imports within Vue components.
- [migrate_temporal.ts](./migrate_temporal.ts): Converts legacy Date syntax to Node Temporal API.
- [sync_to_test.ts](./sync_to_test.ts): Synchronizes stable codebase instances to the test repository.
- [vite-plugin-sass-traps.ts](./vite-plugin-sass-traps.ts): Custom plugin to compile standard SASS/CSS capitalization dynamically.
