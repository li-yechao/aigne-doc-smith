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
      if (!link.startsWith("http") && !allowedLinks.has(link)) {
        isApproved = false;
        detailFeedback.push(
          `Found a dead link in ${source}: [${match[1]}](${link})`
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
