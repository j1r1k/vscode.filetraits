import path from "path";
import { ActiveDocumentContext } from "../types/public";

export function buildActiveDocumentContext(
  workspaceRootPath: string,
  absolutePath: string,
): ActiveDocumentContext {
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
