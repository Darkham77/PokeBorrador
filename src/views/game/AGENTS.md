# Purpose

Core game dashboard, map, and progression views.

## Ownership

Core Frontend / Gameplay Engineers.

## Local Contracts

- **Session Entry & Pending Awards Alert**: Upon mounting the primary game view (`MainGameView.vue`), the view must trigger `eventStore.checkPendingAwards(true)` to alert players with a toast notification if unclaimed competition awards exist in their profile.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
