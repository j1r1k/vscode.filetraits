# filetraits

A VS Code extension that lets you define **traits** — TypeScript-based rules that control how new files are named and where they are placed in your workspace.

Inspired by [traits in Dendron](https://wiki.dendron.so/notes/bdZhT3nF8Yz3WDzKp7hqh/) (no longer maintained).

## How It Works

1. Define trait files in your workspace (by default in `.vscode/filetraits/`)
2. Run **Filetraits: Apply Trait** from the command palette
3. Pick a trait, confirm the file name and location, and the file is created

Traits are written in TypeScript and loaded at runtime — no compilation step needed.

## Commands

| Command | Description |
|---------|-------------|
| `Filetraits: Create Trait from Template` | Scaffold a new trait file with boilerplate |
| `Filetraits: Apply Trait` | Pick a trait and create a new file based on its rules |

## Writing a Trait

A trait is a TypeScript file that exports a `Trait` object using `defineTrait()`:

```typescript
/// <reference path="..." />

export default defineTrait({
  name: "React Component",
  description: "Creates a new React component file",

  getDirectory: (ctx) => {
    // Place the file in the same directory as the active file
    return ctx.activeDocument?.workspaceDirpath ?? "src/components";
  },

  getName: (ctx) => ({
    name: "MyComponent",
    extension: ".tsx",
  }),
});
```

### Trait API

- **`name`** — display name shown in the quick pick menu
- **`description`** *(optional)* — description of what the trait does
- **`getDirectory(context)`** *(optional)* — returns the directory for the new file (defaults to `.`)
- **`getName(context)`** — returns `{ name, extension? }` for the new file
- **`editName`** *(optional)* — whether the user can edit the file name (defaults to `true`)

### Context

The `context` object passed to trait functions provides:

- **`activeDocument`** — info about the currently open file (`workspacePath`, `baseName`, `extension`, `absolutePath`, etc.), or `undefined` if no editor is active
- **`luxon.DateTime`** — the [Luxon](https://moment.github.io/luxon/) `DateTime` class for date/time operations

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `filetraits.traitsDirectory` | `./.vscode/filetraits` | Path (relative to workspace root) where trait files are stored |

## Installation

### From Source

```sh
npm install
npm run vscode:deploy:local
```

This packages the extension into a `.vsix` and installs it into VS Code.

## Development

```sh
npm run compile    # Build
npm run watch      # Build in watch mode
npm run lint       # Lint
npm run test       # Run tests
```

Press **F5** in VS Code to launch the Extension Development Host for debugging.

## License

[MIT](LICENSE)
