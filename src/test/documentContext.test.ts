import * as assert from "assert";
import { buildActiveDocumentContext } from "../documentContext";

suite("buildActiveDocumentContext", () => {
  test("computes workspace-relative path for file under workspace root", () => {
    const ctx = buildActiveDocumentContext(
      "/home/user/project",
      "/home/user/project/src/index.ts",
    );

    assert.strictEqual(ctx.workspacePath, "src/index.ts");
    assert.strictEqual(ctx.workspaceDirpath, "src");
  });

  test("falls back to absolute path when file is outside workspace root", () => {
    const ctx = buildActiveDocumentContext(
      "/home/user/project",
      "/other/location/file.ts",
    );

    assert.strictEqual(ctx.workspacePath, "/other/location/file.ts");
    assert.strictEqual(ctx.workspaceDirpath, "/other/location");
  });

  test("computes baseName and extension correctly", () => {
    const ctx = buildActiveDocumentContext(
      "/workspace",
      "/workspace/src/component.test.tsx",
    );

    assert.strictEqual(ctx.baseName, "component.test.tsx");
    assert.strictEqual(ctx.extension, ".tsx");
  });

  test("computes absoluteDirpath correctly", () => {
    const ctx = buildActiveDocumentContext(
      "/workspace",
      "/workspace/src/utils/helpers.ts",
    );

    assert.strictEqual(ctx.absoluteDirpath, "/workspace/src/utils");
  });

  test("preserves workspaceRootPath in result", () => {
    const ctx = buildActiveDocumentContext(
      "/my/root",
      "/my/root/file.js",
    );

    assert.strictEqual(ctx.workspaceRootPath, "/my/root");
    assert.strictEqual(ctx.absolutePath, "/my/root/file.js");
  });

  test("handles file directly in workspace root", () => {
    const ctx = buildActiveDocumentContext(
      "/workspace",
      "/workspace/README.md",
    );

    assert.strictEqual(ctx.workspacePath, "README.md");
    assert.strictEqual(ctx.workspaceDirpath, ".");
    assert.strictEqual(ctx.baseName, "README.md");
    assert.strictEqual(ctx.extension, ".md");
  });

  test("handles file with no extension", () => {
    const ctx = buildActiveDocumentContext(
      "/workspace",
      "/workspace/Makefile",
    );

    assert.strictEqual(ctx.baseName, "Makefile");
    assert.strictEqual(ctx.extension, "");
  });

  test("does not match partial workspace root prefix", () => {
    const ctx = buildActiveDocumentContext(
      "/home/user/proj",
      "/home/user/project-other/file.ts",
    );

    // Should NOT strip the prefix since it's not an exact directory match
    assert.strictEqual(ctx.workspacePath, "/home/user/project-other/file.ts");
  });
});
