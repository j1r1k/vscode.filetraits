import { Trait } from "../types/public";

// Use 'require' or a dynamic import for the actual factory to bypass the CJS/ESM strict check
const { createJiti } = require("jiti");

export async function loadTrait(traitPath: string): Promise<Trait> {
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
