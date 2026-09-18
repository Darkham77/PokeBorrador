# Purpose

Modal-related scenario simulations verifying lifecycle, hierarchy, Fast Mode (Modo Rápido) background suspension, and DOM cleanup across the browser.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Modal simulations verify that opening obscuring modals immediately triggers Modo Rápido (`isFastMode`) on background layers.
- Closing all modals cleanly restores animations and DOM elements.
- Uses ID-based locators and standard timeouts under 10 seconds per action.
