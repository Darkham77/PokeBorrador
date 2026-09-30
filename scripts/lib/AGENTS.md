# Purpose

Host-level helper libraries for Poké Vicio, primarily database and environment connection utilities.

## Ownership

Architecture & DevOps Engineers.

## Local Contracts

- **Supabase Client**: Host scripts interact with Supabase instances via `supabaseClient.ts`, supporting multi-server configurations and containerized local Docker environments.
- **Auditor Framework Location**: Core auditor base classes, contracts, streaming runners, and unified themes reside in the standalone workspace package `@fgp/auditor` (`packages/auditor/`).

## Key Files

- [`supabaseClient.ts`](./supabaseClient.ts): Multi-server Supabase connection and environment resolution helper.

## Child DOX Index

- _This directory contains only infrastructure utility libraries and has no child directories._
