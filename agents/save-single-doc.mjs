import { saveDocWithTranslations } from "../utils/utils.mjs";

export default async function saveSingleDoc({
  path,
  content,
  docsDir,
  translates,
  labels,
}) {
  const results = await saveDocWithTranslations({
    path,
    content,
    docsDir,
    translates,
    labels,
  });
  return { saveSingleDocResult: results };
}
