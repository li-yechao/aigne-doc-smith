export default async function checkDetailResult({
  structurePlan,
  reviewContent,
}) {
  const linkRegex = /(?<!\!)\[([^\]]+)\]\(([^)]+)\)/g;
  const tableSeparatorRegex = /^\s*\|\s*-+\s*\|\s*$/;

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

  // Check content
  checkLinks(reviewContent, "result");
  checkTableSeparators(reviewContent, "result");
  checkSingleLine(reviewContent, "result");

  return {
    isApproved,
    detailFeedback: detailFeedback.join("\n"),
  };
}
