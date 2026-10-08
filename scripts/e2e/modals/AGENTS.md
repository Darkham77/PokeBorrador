# Purpose

Modal-related scenario simulations verifying lifecycle, hierarchy, Fast Mode (Modo Rápido) background suspension, and DOM cleanup across the browser.

## Ownership

QA / Automation Engineers.

## Local Contracts

- Modal simulations verify that opening obscuring modals immediately triggers Modo Rápido (`isFastMode`) on background layers.
- Closing all modals cleanly restores animations and DOM elements.
- Uses ID-based locators and standard timeouts under 10 seconds per action.

## Work Guidance

- Adhere to domain-type-first contracts without loose any/unknown or naked strings.
- Maintain high cohesion, low complexity, and test coverage across all module modifications.

## Verification

- Run fast lint suite: `npm run lint`
- Run automated tests: `npm run test`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
