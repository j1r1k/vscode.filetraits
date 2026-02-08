// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import path from "path";
import fs from "fs";
import { ActiveDocumentContext, Trait, TraitContext } from "../types/public";
import { traitTemplate } from "./trait";
import { extensionId } from "./globals";
import { access, readdir, writeFile } from "fs/promises";
import { DateTime } from "luxon";

// Use 'require' or a dynamic import for the actual factory to bypass the CJS/ESM strict check
const { createJiti } = require("jiti");

async function loadTrait(traitPath: string): Promise<Trait> {
  // Inject the helper so the script doesn't crash
  (global as any).defineTrait = (trait: Trait) => trait;

  try {
    const jiti = createJiti(__filename, {
      cache: false,
      requireCache: false,
      interopDefault: true,
    });

    const trait: Trait = await jiti.import(traitPath, { default: true });
    return trait;
  } finally {
    delete (global as any).defineTrait;
  }
}

async function loadTraits(): Promise<{
  workspaceRoot: string;
  traits: Trait[];
}> {
  // TODO take from configuration property filetraits.traitsDirectory
  const activeEditor = vscode.window.activeTextEditor;

  if (!vscode.workspace.workspaceFolders) {
    return Promise.reject("No workspace folders defined");
  }

  const workspaceFolder = activeEditor
    ? vscode.workspace.getWorkspaceFolder(activeEditor.document.uri)
    : vscode.workspace.workspaceFolders[0];

  if (!workspaceFolder) {
    return Promise.reject("No workspace folder found");
  }

  const workspaceRoot = workspaceFolder.uri.fsPath;

  // TODO configurable path
  const dirName = path.join(workspaceRoot, ".vscode", "filetraits");

  await access(dirName, fs.constants.R_OK);

  const files: string[] = await readdir(dirName);
  const traits = await Promise.all(
    files
      .filter((file) => file.endsWith(".ts"))
      .map((file) => loadTrait(path.join(dirName, file)))
      .filter((trait) => trait !== undefined),
  );

  return { workspaceRoot, traits };
}

function getActiveDocumentContext(
  workspaceRootPath: string,
): ActiveDocumentContext | undefined {
  const activeTextEditor = vscode.window.activeTextEditor;

  if (!activeTextEditor) {
    return undefined;
  }

  const absolutePath = activeTextEditor.document.uri.path;

  const absoluteDirpath = path.dirname(absolutePath);

  const workspacePath = absolutePath.startsWith(workspaceRootPath + "/")
    ? absolutePath.slice((workspaceRootPath + "/").length)
    : absolutePath;

  const workspaceDirpath = path.dirname(workspacePath);

  const baseName = path.basename(absolutePath);

  const extension = path.extname(absolutePath);

  return {
    workspaceRootPath,
    absolutePath,
    absoluteDirpath,
    workspacePath,
    workspaceDirpath,
    baseName,
    extension,
  };
}

async function getContext(workspaceRoot: string): Promise<TraitContext> {
  return {
    luxon: {
      DateTime: DateTime,
    },
    activeDocument: getActiveDocumentContext(workspaceRoot),
  };
}

export async function showFileSelector(
  initialValue: string,
): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const quickPick = vscode.window.createQuickPick();
    quickPick.value = initialValue;
    quickPick.canSelectMany = false;
    quickPick.show();

    quickPick.onDidChangeValue(async (value) => {
      if (!value) {
        quickPick.items = [];
        return;
      }

      // Use a glob pattern for prefix matching
      // Example: "src/app" becomes "**/src/app*"
      const pattern = `**/${value}*`;

      quickPick.busy = true; // Show loading indicator
      try {
        const uris = await vscode.workspace.findFiles(pattern, null, 10);

        quickPick.items = uris.map((uri) => {
          const relativePath = path.parse(vscode.workspace.asRelativePath(uri));

          const rootDir = relativePath.dir.split(path.sep)?.[0];

          return {
            // TODO trim extension
            label: path.join(relativePath.dir, relativePath.name),
            // TODO additional info (e.g. vault)
            description: `(${rootDir})`,
          };
        });
      } catch (err) {
        console.error(err);
      } finally {
        quickPick.busy = false;
      }
    });

    quickPick.onDidAccept(() => {
      quickPick.hide();
      resolve(quickPick.value);
    });
  });
}

async function applyTrait(): Promise<void> {
  const { workspaceRoot, traits } = await loadTraits();

  const selectedTrait = await vscode.window.showQuickPick(
    Object.values(traits).map((trait) => ({
      label: trait.name,
      trait,
    })),
    {
      canPickMany: false,
      placeHolder: "Select trait",
    },
  );

  if (!selectedTrait) {
    return Promise.resolve();
  }

  const trait = selectedTrait.trait;

  const context = await getContext(workspaceRoot);

  const directory = trait.getDirectory ? trait.getDirectory(context) : ".";
  const { name, extension } = trait.getName(context);

  const newWorkspacePath = path.join(directory, name);

  const newPath = await showFileSelector(newWorkspacePath);

  const newFilePath =
    path.join(workspaceRoot, newPath ?? newWorkspacePath) + (extension ?? "");

  access(newFilePath)
    .then(() => {
      vscode.window.showWarningMessage("File already exists.");
      return true;
    })
    .catch(async () => {
      await writeFile(newFilePath, "");
      return false;
    })
    .then(async (fileAlreadyExists) => {
      const doc = await vscode.workspace.openTextDocument(newFilePath);
      const editor = await vscode.window.showTextDocument(doc);
    });
}

async function generateTrait() {
  // 1. Check if a workspace is open
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage(
      "Please open a workspace before creating a trait.",
    );
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const extension = vscode.extensions.getExtension(extensionId);

  if (!extension) {
    vscode.window.showErrorMessage("Extension not found.");
    return;
  }

  // Resolve the path to your bundled .d.ts file
  const dtsPath = path.join(extension.extensionPath, "types", "public.d.ts");

  // Define the template content
  const templateContent = traitTemplate(dtsPath);

  // Define new trait name promoting user for input
  const traitName = await vscode.window.showInputBox({
    prompt: "Enter the file name of the new trait",
    placeHolder: "e.g., MyCustomTrait",
  });

  if (!traitName) {
    vscode.window.showErrorMessage("Trait file name is required.");
    return;
  }

  // 4. Create the file (e.g., .vscode/my-trait.ts)
  // TODO configurable
  const dotVscodeDir = path.join(rootPath, ".vscode", "filetraits");
  const filePath = path.join(dotVscodeDir, `${traitName}.ts`);

  try {
    if (!fs.existsSync(dotVscodeDir)) {
      fs.mkdirSync(dotVscodeDir);
    }

    if (fs.existsSync(filePath)) {
      vscode.window.showErrorMessage("Trait file already exists.");
      return;
    }

    fs.writeFileSync(filePath, templateContent);

    // 5. Open the newly created file
    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(
      "Trait template generated successfully.",
    );
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to create template: ${err}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("filetraits.generateTrait", generateTrait),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("filetraits.applyTrait", applyTrait),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
