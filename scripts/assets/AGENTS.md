# Purpose

Automation scripts for assets downloads, sprite conversion to WebP format, spritesheets optimization, and item sprite collision auditing.

## Key Files

- `audit_item_sprite_collisions.ts`: Scans `items.json` to detect duplicate sprite usages across items and emits structured warnings.
- `audit_item_assets.ts`: Compares database items against physical images in `public/assets/sprites/`.
- `convert_assets.ts`: Asset image format conversion and normalization.
- `optimize_sprites.ts`: Sprite optimization and compression.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
