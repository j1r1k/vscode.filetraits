import * as assert from "assert";
import path from "path";
import fs from "fs";
import os from "os";
import { loadTrait } from "../loadTrait";

suite("loadTrait", () => {
  let tmpDir: string;

  setup(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "filetraits-test-"));
  });

  teardown(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("loads a valid trait file and returns the trait object", async () => {
    const traitFile = path.join(tmpDir, "test-trait.ts");
    fs.writeFileSync(
      traitFile,
      `export default defineTrait({
  name: "Test Trait",
  getName: () => ({ name: "test-file", extension: ".ts" }),
});
`,
    );

    const trait = await loadTrait(traitFile);

    assert.strictEqual(trait.name, "Test Trait");
    assert.deepStrictEqual(trait.getName({} as any), {
      name: "test-file",
      extension: ".ts",
    });
  });

  test("loads trait with optional getDirectory", async () => {
    const traitFile = path.join(tmpDir, "dir-trait.ts");
    fs.writeFileSync(
      traitFile,
      `export default defineTrait({
  name: "Dir Trait",
  getDirectory: () => "src/components",
  getName: () => ({ name: "component" }),
});
`,
    );

    const trait = await loadTrait(traitFile);

    assert.strictEqual(trait.getDirectory!({} as any), "src/components");
  });

  test("loads trait with description", async () => {
    const traitFile = path.join(tmpDir, "desc-trait.ts");
    fs.writeFileSync(
      traitFile,
      `export default defineTrait({
  name: "Described",
  description: "A trait with a description",
  getName: () => ({ name: "file" }),
});
`,
    );

    const trait = await loadTrait(traitFile);

    assert.strictEqual(trait.description, "A trait with a description");
  });

  test("cleans up global defineTrait after loading", async () => {
    const traitFile = path.join(tmpDir, "cleanup-trait.ts");
    fs.writeFileSync(
      traitFile,
      `export default defineTrait({
  name: "Cleanup",
  getName: () => ({ name: "file" }),
});
`,
    );

    await loadTrait(traitFile);

    assert.strictEqual(
      (global as any).defineTrait,
      undefined,
      "defineTrait should be cleaned up from global",
    );
  });

  test("cleans up global defineTrait even on error", async () => {
    const traitFile = path.join(tmpDir, "nonexistent.ts");

    try {
      await loadTrait(traitFile);
    } catch {
      // expected to fail
    }

    assert.strictEqual(
      (global as any).defineTrait,
      undefined,
      "defineTrait should be cleaned up even after error",
    );
  });
});
