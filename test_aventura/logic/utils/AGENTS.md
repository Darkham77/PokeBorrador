# Purpose

This directory provides shared utility functions and math helpers for adventure mode and studio viewports.

## Ownership

Game Prototyping / Adventure Suite.

## Local Contracts

- Functions in this directory must remain pure, side-effect free, and domain-agnostic where possible.
- Adhere strictly to the O(1) complexity and Zero-Fallback mandates.

## Key Files

- [`gridBfsUtils.ts`](./gridBfsUtils.ts): Multi-source 2D grid BFS distance field calculation helper.
- [`svgCoordinateUtils.ts`](./svgCoordinateUtils.ts): Coordinate transformations, bounding calculations, and viewport wheel zoom math for SVG viewports.

## Work Guidance

- Reusable vector and coordinate math should be declared here rather than duplicated across viewport components.

## Verification

- `npm run auditor:dox-integrity`
- `npm run auditor:lint`

## Child DOX Index

- _This directory contains specialized domain logic and files with no subdirectories._
