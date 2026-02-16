# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code extension ("filetraits") that lets users define **traits** — TypeScript-based templates that control how new files are named and placed in a workspace. Users create trait files in `.vscode/filetraits/` and apply them via command palette.

## Build & Development Commands

- `npm run compile` — compile TypeScript to `out/`
- `npm run watch` — compile in watch mode
- `npm run lint` — run ESLint on `src/`
- `npm run test` — run tests via `@vscode/test-cli` (requires VS Code; configured in `.vscode-test.mjs`)
- `npm run vscode:package` — package into `.vsix` in `dist/`
- `npm run vscode:deploy:local` — package and install locally into VS Code

To debug: press F5 in VS Code (launches Extension Development Host via `.vscode/launch.json`).

## Architecture

**Extension entry point:** `src/extension.ts` — registers two commands:
- `filetraits.generateTrait` — scaffolds a new trait `.ts` file from a template into `.vscode/filetraits/`
- `filetraits.applyTrait` — loads all traits, lets user pick one, then creates a new file based on trait's naming/directory rules

**Trait loading:** Uses `jiti` to dynamically import user-authored TypeScript trait files at runtime (no pre-compilation needed). A global `defineTrait()` helper is temporarily injected during loading.

**Public API types:** `types/public.d.ts` — defines `Trait`, `TraitContext`, `ActiveDocumentContext`. This file is shipped with the extension (see `.vscodeignore` allowlist) so user trait files can reference it via `/// <reference path="..." />`.

**Other source files:**
- `src/trait.ts` — generates the trait template string
- `src/globals.ts` — extension ID constant (`marsi-dev.filetraits`)

## Key Details

- TypeScript compiles with `module: Node16`, `target: ES2022`, strict mode
- Extension ID: `marsi-dev.filetraits`
- Minimum VS Code engine: `^1.108.0`
- The `types/` directory is explicitly included in the packaged extension (via `!types/` in `.vscodeignore`)
- Traits directory is configurable via `filetraits.traitsDirectory` setting (default `.vscode/filetraits`), though the config isn't fully wired up yet (marked TODO)
