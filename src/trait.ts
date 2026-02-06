export function traitTemplate(dtsPath: string): string {
  // TODO could be mustache template
  const templateContent = `/// <reference path="${dtsPath}" />

export default defineTrait({
  name: "New Trait",
  description: "Describe what this trait does here",

  getDirectoryPath: (ctx) => {
    // Return the directory where the new file should be created
    return \`\${ctx.baseName}-custom\`;
  },

  getTitle: (ctx) => {
    return \`Create \${ctx.baseName} logic\`;
  }
});
`;

  return templateContent;
}
