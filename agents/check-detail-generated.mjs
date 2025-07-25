import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AnthropicChatModel } from "@aigne/anthropic";
import { AIGNE, TeamAgent } from "@aigne/core";
import { GeminiChatModel } from "@aigne/gemini";
import { OpenAIChatModel } from "@aigne/openai";

// Get current script directory
const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function checkDetailGenerated(
  { path, docsDir, metadata, originalStructurePlan, ...rest },
  options
) {
  // Check if the detail file already exists
  const flatName = path.replace(/^\//, "").replace(/\//g, "-");
  const fileFullName = `${flatName}.md`;
  const filePath = join(docsDir, fileFullName);
  let detailGenerated = true;
  try {
    await access(filePath);
  } catch {
    detailGenerated = false;
  }

  // Check if sourceIds have changed by comparing with original structure plan
  let sourceIdsChanged = false;
  if (originalStructurePlan && metadata && metadata.sourceIds) {
    // Find the original node in the structure plan
    const originalNode = originalStructurePlan.find(
      (node) => node.path === path
    );

    if (
      originalNode &&
      originalNode.metadata &&
      originalNode.metadata.sourceIds
    ) {
      const originalSourceIds = originalNode.metadata.sourceIds;
      const currentSourceIds = metadata.sourceIds;

      // Compare arrays (order doesn't matter, but content does)
      if (originalSourceIds.length !== currentSourceIds.length) {
        sourceIdsChanged = true;
      } else {
        // Check if any sourceId is different
        const originalSet = new Set(originalSourceIds);
        const currentSet = new Set(currentSourceIds);

        if (originalSet.size !== currentSet.size) {
          sourceIdsChanged = true;
        } else {
          // Check if any element is different
          for (const sourceId of originalSourceIds) {
            if (!currentSet.has(sourceId)) {
              sourceIdsChanged = true;
              break;
            }
          }
        }
      }
    }
  }

  // If file exists and sourceIds haven't changed, no need to regenerate
  if (detailGenerated && !sourceIdsChanged) {
    return {
      path,
      docsDir,
      ...rest,
      detailGenerated: true,
    };
  }

  // If sourceIds have changed, regenerate even if file exists
  const aigne = await AIGNE.load(join(__dirname, "../"), {
    models: [
      {
        name: OpenAIChatModel.name,
        create: (params) => new OpenAIChatModel({ ...params }),
      },
      {
        name: AnthropicChatModel.name,
        create: (params) => new AnthropicChatModel({ ...params }),
      },
      {
        name: GeminiChatModel.name,
        create: (params) => new GeminiChatModel({ ...params }),
      },
    ],
  });

  const teamAgent = TeamAgent.from({
    name: "generate-detail",
    skills: [aigne.agents["detail-generator-and-translate"]],
  });

  const result = await options.context.invoke(teamAgent, {
    ...rest,
    docsDir,
    path,
    metadata,
    originalStructurePlan,
  });

  return {
    path,
    docsDir,
    ...rest,
    result,
  };
}
