export default function transformDetailDatasources({
  sourceIds,
  datasourcesList,
}) {
  // Build a map for fast lookup
  const dsMap = Object.fromEntries(
    (datasourcesList || []).map((ds) => [ds.sourceId, ds.content])
  );
  // Collect formatted contents in order
  const contents = (sourceIds || [])
    .filter((id) => dsMap[id])
    .map((id) => `// sourceId: ${id}\n${dsMap[id]}\n`);
  return { detailDataSources: contents.join("") };
}
