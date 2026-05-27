---
name: populate-tester-inventory
description: Utility script to fill the inventory with test items. Delegates the usage protocol to the manual `@/project-standards/references/browser_testing_manual.md`.
---

# Skill: Populate Tester Inventory

> [!TIP]
> This tool is ideal for preparing the environment before performing detailed functional tests in the browser.

## Quick Usage

1. Generate the injection snippet:

   ```bash
   node --experimental-strip-types .agents/skills/populate-tester-inventory/scripts/populate_inventory.ts
   ```

2. Follow the detailed injection protocol in the [Browser Testing Manual](../project-standards/references/browser_testing_manual.md).

To find out which items are included and how to expand the script, consult the standards manual.
