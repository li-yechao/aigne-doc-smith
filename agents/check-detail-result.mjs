export default async function checkDetailResult({
  structurePlan,
  reviewContent,
}) {
  const linkRegex = /(?<!\!)\[([^\]]+)\]\(([^)]+)\)/g;
  const tableSeparatorRegex = /\|\s*-\s*\|/g;

  let isApproved = true;
  const detailFeedback = [];

  const allowedLinks = new Set(structurePlan.map((item) => item.path));

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

      // Skip if already has extension
      if (/\.[a-zA-Z0-9]+$/.test(path)) continue;

      // Only process relative paths or paths starting with /
      if (!path) continue;

      // Check if this link is in the allowed links set
      if (!allowedLinks.has(trimLink)) {
        isApproved = false;
        detailFeedback.push(
          `Found a dead link in ${source}: [${match[1]}](${trimLink})`
        );
      }
    }
  };

  const checkTableSeparators = (text, source) => {
    if (tableSeparatorRegex.test(text)) {
      isApproved = false;
      detailFeedback.push(
        `Found an incorrect table separator in ${source}: | - |`
      );
    }
  };

  // Check content
  checkLinks(reviewContent, "result");
  checkTableSeparators(reviewContent, "result");

  return {
    isApproved,
    detailFeedback: detailFeedback.join("\n"),
  };
}
