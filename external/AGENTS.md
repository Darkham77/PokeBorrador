# external/ — Read-Only External Reference Codebases

This directory contains external codebases used **as documentation and reference only**.

## Rules

- **Read-Only**: Never modify files in this directory.
- **No Lint / No Build**: `external/` is excluded from ESLint, TypeScript type-checking, Fallow, and all build pipelines.
- **No Tests**: No test coverage is measured or expected for these files.
- **No Git History**: Subdirectories here contain only source snapshots — no `.git` folders.
- **Versioned**: `external/` IS committed to git so agents and developers can reference the code directly.

## Contents

| Directory | Source | Purpose |
|---|---|---|
| `pokemon-showdown-code/` | https://github.com/pkmn/ps.git | Official Pokémon Showdown engine — source of truth for battle logic and @pkmn/sim behavior |
| `pokemon-showdown-ai/` | https://github.com/fr33lo/pokemon-showdown-ai | Reference AI implementation for Pokémon Showdown battles |

## Updating

To refresh a snapshot:
```sh
# pokemon-showdown-code
robocopy <cloned-pkmn-ps-repo> external\pokemon-showdown-code /E /NP

# pokemon-showdown-ai
robocopy <cloned-ai-repo> external\pokemon-showdown-ai /E /NP
```

Remove any `.git` folder from the copy before saving.
