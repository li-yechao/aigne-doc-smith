import { saveDocWithTranslations } from "../utils/utils.mjs";

export default async function saveSingleDoc({
  path,
  content,
  docsDir,
  translates,
}) {
  const results = await saveDocWithTranslations({
    path,
    content,
    docsDir,
    translates,
  });
  return { saveSingleDocResult: results };
}
