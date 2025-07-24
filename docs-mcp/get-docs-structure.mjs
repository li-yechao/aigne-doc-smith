import fs from "node:fs/promises";

const structureDir =
  "/Users/lban/arcblock/code/arcblock-sdk-docs/packages/aigne-framework/output/structure-plan.json";

export default async function getDocsStructure() {
  const structure = await fs.readFile(structureDir, "utf-8");
  return { structure };
}

getDocsStructure.description = "Get AIGNE Framework docs structure";
