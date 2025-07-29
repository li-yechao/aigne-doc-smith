import fs from "node:fs/promises";
import path from "node:path";

export function processContent({ content }) {
  // Match markdown regular links [text](link), exclude images ![text](link)
  return content.replace(
    /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g,
    (match, text, link) => {
      const trimLink = link.trim();
      // Exclude external links and mailto
      if (/^(https?:\/\/|mailto:)/.test(trimLink)) return match;
      // Preserve anchors
      const [path, hash] = trimLink.split("#");
      // Skip if already has extension
      if (/\.[a-zA-Z0-9]+$/.test(path)) return match;
      // Only process relative paths or paths starting with /
      if (!path) return match;
      // Flatten to ./xxx-yyy.md
      let finalPath = path;
      if (path.startsWith(".")) {
        finalPath = path.replace(/^\./, "");
      }
      let flatPath = finalPath.replace(/^\//, "").replace(/\//g, "-");
      flatPath = `./${flatPath}.md`;
      const newLink = hash ? `${flatPath}#${hash}` : flatPath;
      return `[${text}](${newLink})`;
    }
  );
}

/**
 * Save a single document and its translations to files
 * @param {Object} params
 * @param {string} params.path - Relative path (without extension)
 * @param {string} params.content - Main document content
 * @param {string} params.docsDir - Root directory
 * @param {Array<{language: string, translation: string}>} [params.translates] - Translation content
 * @param {Array<string>} [params.labels] - Document labels for front matter
 * @returns {Promise<Array<{ path: string, success: boolean, error?: string }>>}
 */
export async function saveDocWithTranslations({
  path: docPath,
  content,
  docsDir,
  translates = [],
  labels,
}) {
  const results = [];
  try {
    // Flatten path: remove leading /, replace all / with -
    const flatName = docPath.replace(/^\//, "").replace(/\//g, "-");
    const fileFullName = `${flatName}.md`;
    const filePath = path.join(docsDir, fileFullName);
    await fs.mkdir(docsDir, { recursive: true });

    // Add labels front matter if labels are provided
    let finalContent = processContent({ content });
    if (labels && labels.length > 0) {
      const frontMatter = `---\nlabels: ${JSON.stringify(labels)}\n---\n\n`;
      finalContent = frontMatter + finalContent;
    }

    await fs.writeFile(filePath, finalContent, "utf8");
    results.push({ path: filePath, success: true });

    for (const translate of translates) {
      const translateFileName = `${flatName}.${translate.language}.md`;
      const translatePath = path.join(docsDir, translateFileName);

      // Add labels front matter to translation content if labels are provided
      let finalTranslationContent = processContent({
        content: translate.translation,
      });
      if (labels && labels.length > 0) {
        const frontMatter = `---\nlabels: ${JSON.stringify(labels)}\n---\n\n`;
        finalTranslationContent = frontMatter + finalTranslationContent;
      }

      await fs.writeFile(translatePath, finalTranslationContent, "utf8");
      results.push({ path: translatePath, success: true });
    }
  } catch (err) {
    results.push({ path: docPath, success: false, error: err.message });
  }
  return results;
}
