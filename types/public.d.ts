import { DateTime } from "luxon";

export type ActiveDocumentContext = {
  workspaceRootPath: string;
  absolutePath: string;
  absoluteDirpath: string;
  workspacePath: string;
  workspaceDirpath: string;
  baseName: string;
  extension: string;
};

export type TraitContext = {
  activeDocument: ActiveDocumentContext | undefined;
  luxon: {
    DateTime: typeof DateTime;
  };
};

export type Trait = {
  /**
   * trait name
   */
  name: string;
  /**
   * optional description of the trait
   */
  description?: string;

  /**
   * current directory by default
   * @param context
   * @returns
   */
  getDirectory?: (context: TraitContext) => string;

  getName: (context: TraitContext) => {
    name: string;
    selection?: [number, number];
  };

  /**
   * true by default
   */
  editName?: boolean;

  /**
   * no template is used by default
   * @param context
   * @returns
   */
  getTemplatePath?: (context: TraitContext) => string;
};

declare global {
  function defineTrait(trait: Trait): Trait;
}
