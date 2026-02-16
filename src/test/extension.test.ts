import * as assert from "assert";
import * as vscode from "vscode";
import { extensionId } from "../globals";

suite("Extension", () => {
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension(extensionId);
    if (ext && !ext.isActive) {
      await ext.activate();
    }
  });

  test("extension is present", () => {
    const ext = vscode.extensions.getExtension(extensionId);
    assert.ok(ext, `Extension ${extensionId} should be installed`);
  });

  test("registers generateTrait command", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("filetraits.generateTrait"),
      "generateTrait command should be registered",
    );
  });

  test("registers applyTrait command", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("filetraits.applyTrait"),
      "applyTrait command should be registered",
    );
  });
});
