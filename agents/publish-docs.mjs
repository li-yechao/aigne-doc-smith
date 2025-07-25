import { join } from "node:path";
import { publishDocs as publishDocsFn } from "@aigne/publish-docs";

export default async function publishDocs({ docsDir, appUrl, boardId }) {
  if (!process.env.DOC_DISCUSS_KIT_ACCESS_TOKEN) {
    throw new Error("DOC_DISCUSS_KIT_ACCESS_TOKEN is not set");
  }
  // if (!process.env.DOC_DISCUSS_KIT_URL) {
  //   throw new Error("DOC_DISCUSS_KIT_URL is not set");
  // }
  // if (!process.env.DOC_DISCUSS_KIT_BOARD_ID) {
  //   throw new Error("DOC_DISCUSS_KIT_BOARD_ID is not set");
  // }

  process.env.DOC_ROOT_DIR = docsDir;

  const sidebarPath = join(docsDir, "_sidebar.md");

  const { success } = await publishDocsFn({
    sidebarPath,
    accessToken: process.env.DOC_DISCUSS_KIT_ACCESS_TOKEN,
    appUrl,
    boardId,
  });

  return {
    publishResult: {
      success,
    },
  };
}

publishDocs.input_schema = {
  type: "object",
  properties: {
    docsDir: {
      type: "string",
      description: "The directory of the docs",
    },
    appUrl: {
      type: "string",
      description: "The url of the app",
      default: "https://www.staging.arcblock.io/",
    },
    boardId: {
      type: "string",
      description: "The id of the board",
    },
  },
};
