import * as assert from "assert";
import path from "path";
import { resolveTraitsDirectory } from "../traitsDirectory";

suite("resolveTraitsDirectory", () => {
  test("resolves relative path against workspace root", () => {
    const result = resolveTraitsDirectory("/home/user/project", "./traits");

    assert.strictEqual(result, path.resolve("/home/user/project", "./traits"));
  });

  test("resolves default .vscode/filetraits path", () => {
    const result = resolveTraitsDirectory(
      "/home/user/project",
      "./.vscode/filetraits",
    );

    assert.strictEqual(
      result,
      path.resolve("/home/user/project", ".vscode/filetraits"),
    );
  });

  test("resolves absolute path as-is", () => {
    const result = resolveTraitsDirectory(
      "/home/user/project",
      "/etc/shared-traits",
    );

    assert.strictEqual(result, "/etc/shared-traits");
  });

  test("resolves path without leading dot-slash", () => {
    const result = resolveTraitsDirectory("/workspace", "custom/traits");

    assert.strictEqual(result, path.resolve("/workspace", "custom/traits"));
  });
});
