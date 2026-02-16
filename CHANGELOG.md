# Changelog

All notable changes to the filetraits extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.0.2] - 2026-02-16

### Added

- Configurable traits directory via `filetraits.traitsDirectory` setting
- GitHub Actions workflow for building and publishing VSIX releases
- Test coverage for document context, traits directory resolution, trait loading, and extension activation
- README with usage documentation, trait API reference, and configuration
- CLAUDE.md for Claude Code guidance
- MIT License

## [0.0.1] - 2026-02-05

### Added

- `Filetraits: Create Trait from Template` command to scaffold new trait files
- `Filetraits: Apply Trait` command to create files based on trait rules
- TypeScript trait loading via jiti (no pre-compilation needed)
- File selector with workspace-aware fuzzy matching
- Luxon DateTime available in trait context
