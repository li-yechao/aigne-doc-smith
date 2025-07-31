import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AnthropicChatModel } from "@aigne/anthropic";
import { AIGNE } from "@aigne/core";
import { GeminiChatModel } from "@aigne/gemini";
import { OpenAIChatModel } from "@aigne/openai";

// Get current script directory
const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function checkStructurePlanning(
  { originalStructurePlan, feedback, ...rest },
  options
) {
  // If originalStructurePlan exists, return directly
  if (originalStructurePlan && !feedback) {
    return {
      structurePlan: originalStructurePlan,
    };
  }

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

  const panningAgent = aigne.agents["reflective-structure-planner"];

  const result = await options.context.invoke(panningAgent, {
    feedback,
    originalStructurePlan,
    ...rest,
  });

  return {
    ...result,
    feedback: "", // clear feedback
    originalStructurePlan: originalStructurePlan
      ? originalStructurePlan
      : JSON.parse(JSON.stringify(result.structurePlan || [])),
  };
}
