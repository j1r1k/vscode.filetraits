import * as assert from "assert";
import { traitTemplate } from "../trait";

suite("traitTemplate", () => {
  const dtsPath = "/path/to/types/public.d.ts";
  const result = traitTemplate(dtsPath);

  test("includes triple-slash reference directive with provided path", () => {
    assert.ok(
      result.includes(`/// <reference path="${dtsPath}" />`),
      "should contain reference directive",
    );
  });

  test("includes defineTrait call", () => {
    assert.ok(
      result.includes("export default defineTrait("),
      "should contain defineTrait export",
    );
  });

  test("includes default trait name", () => {
    assert.ok(
      result.includes('"New Trait"'),
      "should contain default name",
    );
  });

  test("includes description placeholder", () => {
    assert.ok(
      result.includes("description:"),
      "should contain description field",
    );
  });
});
