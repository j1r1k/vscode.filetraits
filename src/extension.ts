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
  traits: Record<string, Trait>;
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
  const traitList = await Promise.all(
    files
      .filter((file) => file.endsWith(".ts"))
      .map((file) => loadTrait(path.join(dirName, file))),
  );

  const traits = traitList.reduce(
    (acc, trait) => ({ ...acc, [trait.name]: trait }),
    {} as Record<string, Trait>,
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

async function applyTrait(): Promise<void> {
  const { workspaceRoot, traits } = await loadTraits();

  const traitName: string | undefined = await vscode.window.showQuickPick(
    Object.keys(traits),
    {
      canPickMany: false,
      placeHolder: "Select trait",
    },
  );

  if (!traitName) {
    return Promise.reject("No trait selected");
  }

  const trait = traits[traitName];

  const context = await getContext(workspaceRoot);

  vscode.window.showInformationMessage("context: " + JSON.stringify(context));

  const directory = trait.getDirectory ? trait.getDirectory(context) : ".";
  const { name, selection } = trait.getName(context);

  vscode.window.showInformationMessage(`directory=${directory}`);

  const newWorkspacePath = path.join(directory, name);
  const newPath = await vscode.window.showInputBox({
    value: newWorkspacePath,
    valueSelection:
      selection && newWorkspacePath !== name
        ? [
            selection[0] + directory.length + 1 /* slash */,
            selection[1] + directory.length + 1,
          ]
        : selection,
  });

  const newFilePath = path.join(workspaceRoot, newPath ?? newWorkspacePath);

  vscode.window.showInformationMessage(newFilePath);

  access(newFilePath)
    .then(() => {
      vscode.window.showWarningMessage("File already exists.");
    })
    .catch(async () => {
      // file doesn't exist, we want to create it and apply template
      await writeFile(newFilePath, "" /* TODO contents */);
    })
    .then(async () => {
      const doc = await vscode.workspace.openTextDocument(newFilePath);
      await vscode.window.showTextDocument(doc);
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
