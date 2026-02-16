import path from "path";

export function resolveTraitsDirectory(
  workspaceRoot: string,
  configuredPath: string,
): string {
  return path.resolve(workspaceRoot, configuredPath);
}
