export default async function checkDetailResult({
  structurePlan,
  reviewContent,
}) {
  const linkRegex = /(?<!\!)\[([^\]]+)\]\(([^)]+)\)/g;
  const tableSeparatorRegex = /^\s*\|\s*-+\s*\|\s*$/;
  const codeBlockRegex = /^\s+```(?:\w+)?$/;

  let isApproved = true;
  const detailFeedback = [];

  // Create a set of allowed links, including both original paths and processed .md paths
  const allowedLinks = new Set();
  structurePlan.forEach((item) => {
    // Add original path
    allowedLinks.add(item.path);

    // Add processed .md path (same logic as processContent in utils.mjs)
    let processedPath = item.path;
    if (processedPath.startsWith(".")) {
      processedPath = processedPath.replace(/^\./, "");
    }
    let flatPath = processedPath.replace(/^\//, "").replace(/\//g, "-");
    flatPath = `./${flatPath}.md`;
    allowedLinks.add(flatPath);
  });

  const checkLinks = (text, source) => {
    let match;
    while ((match = linkRegex.exec(text)) !== null) {
      const link = match[2];
      const trimLink = link.trim();

      // Only check links that processContent would process
      // Exclude external links and mailto
      if (/^(https?:\/\/|mailto:)/.test(trimLink)) continue;

      // Preserve anchors
      const [path, hash] = trimLink.split("#");

      // Only process relative paths or paths starting with /
      if (!path) continue;

      // Check if this link is in the allowed links set
      if (!allowedLinks.has(trimLink)) {
        isApproved = false;
        detailFeedback.push(
          `Found a dead link in ${source}: [${match[1]}](${trimLink}), ensure the link exists in the structure plan path`
        );
      }
    }
  };

  const checkTableSeparators = (text, source) => {
    // Split text into lines and check each line
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (tableSeparatorRegex.test(line)) {
        isApproved = false;
        detailFeedback.push(
          `Found an incorrect table separator in ${source} at line ${
            i + 1
          }: ${line.trim()}`
        );
      }
    }
  };

  const checkSingleLine = (text, source) => {
    // Count newline characters to check if content is only on one line
    const newlineCount = (text.match(/\n/g) || []).length;
    if (newlineCount === 0 && text.trim().length > 0) {
      isApproved = false;
      detailFeedback.push(
        `Found single line content in ${source}: content appears to be on only one line, check for missing line breaks`
      );
    }
  };

  const checkCodeBlockIndentation = (text, source) => {
    // Split text into lines and check each line
    const lines = text.split("\n");
    let inCodeBlock = false;
    let codeBlockIndentLevel = 0;
    let codeBlockStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if this line is a code block marker
      if (codeBlockRegex.test(line)) {
        if (!inCodeBlock) {
          // Starting a new code block
          inCodeBlock = true;
          codeBlockStartLine = i + 1;
          // Calculate indentation level of the code block marker
          const match = line.match(/^(\s*)(```)/);
          codeBlockIndentLevel = match ? match[1].length : 0;
        } else {
          // Ending the code block
          inCodeBlock = false;
          codeBlockIndentLevel = 0;
        }
        continue;
      }

      // If we're inside a code block, check if content has proper indentation
      if (inCodeBlock) {
        const contentIndentLevel = line.match(/^(\s*)/)[1].length;

        // If code block marker has indentation, content should have at least the same indentation
        if (
          codeBlockIndentLevel > 0 &&
          contentIndentLevel < codeBlockIndentLevel
        ) {
          isApproved = false;
          detailFeedback.push(
            `Found code block with inconsistent indentation in ${source} at line ${codeBlockStartLine}: code block marker has ${codeBlockIndentLevel} spaces indentation but content at line ${
              i + 1
            } has only ${contentIndentLevel} spaces indentation`
          );
          // Reset to avoid multiple errors for the same code block
          inCodeBlock = false;
          codeBlockIndentLevel = 0;
        }
      }
    }
  };

  // Check content
  checkLinks(reviewContent, "result");
  checkTableSeparators(reviewContent, "result");
  checkSingleLine(reviewContent, "result");
  checkCodeBlockIndentation(reviewContent, "result");

  return {
    isApproved,
    detailFeedback: detailFeedback.join("\n"),
  };
}
