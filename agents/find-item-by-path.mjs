export default async function findItemByPath({
  path,
  structurePlanResult,
  boardId,
}) {
  let foundItem = null;

  // First try direct path matching
  foundItem = structurePlanResult.find((item) => item.path === path);

  // If not found and boardId is provided, try boardId-flattenedPath format matching
  if (!foundItem && boardId) {
    // Check if path starts with boardId followed by a dash
    if (path.startsWith(`${boardId}-`)) {
      // Extract the flattened path part after boardId-
      const flattenedPath = path.substring(boardId.length + 1);

      // Find item by comparing flattened paths
      foundItem = structurePlanResult.find((item) => {
        // Convert item.path to flattened format (replace / with -)
        const itemFlattenedPath = item.path
          .replace(/^\//, "")
          .replace(/\//g, "-");
        return itemFlattenedPath === flattenedPath;
      });
    }
  }

  if (!foundItem) {
    throw new Error(
      `Item with path "${path}" not found in structurePlanResult`
    );
  }

  // Merge the found item with originalStructurePlan
  return {
    ...foundItem,
  };
}
