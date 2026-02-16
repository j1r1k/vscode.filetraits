import * as vscode from "vscode";
import path from "path";
import fs from "fs";
import { Trait, TraitContext } from "../types/public";
import { traitTemplate } from "./trait";
import { extensionId } from "./globals";
import { buildActiveDocumentContext } from "./documentContext";
import { resolveTraitsDirectory } from "./traitsDirectory";
import { loadTrait } from "./loadTrait";
import { access, readdir, writeFile } from "fs/promises";
import { DateTime } from "luxon";

function getTraitsDirectory(workspaceRoot: string): string {
  const config = vscode.workspace.getConfiguration("filetraits");
  const traitsDir = config.get<string>("traitsDirectory", "./.vscode/filetraits");
  return resolveTraitsDirectory(workspaceRoot, traitsDir);
}

async function loadTraits(): Promise<{
  workspaceRoot: string;
  traits: Trait[];
}> {
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

  const dirName = getTraitsDirectory(workspaceRoot);

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
) {
  const activeTextEditor = vscode.window.activeTextEditor;

  if (!activeTextEditor) {
    return undefined;
  }

  return buildActiveDocumentContext(
    workspaceRootPath,
    activeTextEditor.document.uri.path,
  );
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

  return access(newFilePath)
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

  const dtsPath = path.join(extension.extensionPath, "types", "public.d.ts");
  const templateContent = traitTemplate(dtsPath);

  const traitName = await vscode.window.showInputBox({
    prompt: "Enter the file name of the new trait",
    placeHolder: "e.g., MyCustomTrait",
  });

  if (!traitName) {
    vscode.window.showErrorMessage("Trait file name is required.");
    return;
  }

  const dotVscodeDir = getTraitsDirectory(rootPath);
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

export function deactivate() {}
