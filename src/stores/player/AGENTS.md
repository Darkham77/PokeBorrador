# Purpose

Manage player profile info, player class configuration, profile customization/cosmetics, and search indexes.

## Ownership

UI/UX Team / Profile Systems Engineers.

## Local Contracts

- Gender is a save property (signup only). Do not query or request gender selection on login flows.
- Class choices and achievement flags must be sanitized before persisting.

## Work Guidance

- Access stats and classes using central data structures to prevent desynchronization.

## Verification

- Run `npm run audit`.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
