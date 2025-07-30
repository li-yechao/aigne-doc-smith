import { join } from "node:path";
import { joinURL } from "ufo";
import open from "open";
import { publishDocs as publishDocsFn } from "@aigne/publish-docs";
import { createConnect } from "@aigne/cli/utils/load-aigne.js";
import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { parse, stringify } from "yaml";
import { execSync } from "node:child_process";
import { basename } from "node:path";

const WELLKNOWN_SERVICE_PATH_PREFIX = "/.well-known/service";

/**
 * Get project name from git repository or current directory
 * @returns {string} - The project name
 */
function getProjectName() {
  // Check if we're in a git repository
  try {
    const gitRemote = execSync("git remote get-url origin", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    // Extract repository name from git remote URL
    const repoName = gitRemote.split("/").pop().replace(".git", "");
    return repoName;
  } catch (error) {
    // Not in git repository or no origin remote, use current directory name
    return basename(process.cwd());
  }
}

/**
 * Get access token from environment, config file, or prompt user for authorization
 * @param {string} appUrl - The application URL
 * @returns {Promise<string>} - The access token
 */
async function getAccessToken(appUrl) {
  const DOC_SMITH_ENV_FILE = join(
    homedir(),
    ".aigne",
    "doc-smith-connected.yaml"
  );
  const { hostname } = new URL(appUrl);

  let accessToken = process.env.DOC_DISCUSS_KIT_ACCESS_TOKEN;

  // Check if access token exists in environment or config file
  if (!accessToken) {
    try {
      if (existsSync(DOC_SMITH_ENV_FILE)) {
        const data = await readFile(DOC_SMITH_ENV_FILE, "utf8");
        if (data.includes("DOC_DISCUSS_KIT_ACCESS_TOKEN")) {
          const envs = parse(data);
          if (envs[hostname] && envs[hostname].DOC_DISCUSS_KIT_ACCESS_TOKEN) {
            accessToken = envs[hostname].DOC_DISCUSS_KIT_ACCESS_TOKEN;
          }
        }
      }
    } catch (error) {
      console.warn("Failed to read config file:", error.message);
    }
  }

  // If still no access token, prompt user to authorize
  if (!accessToken) {
    const DISCUSS_KIT_URL = appUrl;
    const connectUrl = joinURL(
      new URL(DISCUSS_KIT_URL).origin,
      WELLKNOWN_SERVICE_PATH_PREFIX
    );

    try {
      const result = await createConnect({
        connectUrl: connectUrl,
        connectAction: "gen-simple-access-key",
        source: `@aigne/cli doc-smith connect to Discuss Kit`,
        closeOnSuccess: true,
        openPage: (pageUrl) => open(pageUrl),
      });

      accessToken = result.accessKeySecret;
      process.env.DOC_DISCUSS_KIT_ACCESS_TOKEN = accessToken;

      // Save the access token to config file
      const aigneDir = join(homedir(), ".aigne");
      if (!existsSync(aigneDir)) {
        mkdirSync(aigneDir, { recursive: true });
      }

      const existingConfig = existsSync(DOC_SMITH_ENV_FILE)
        ? parse(await readFile(DOC_SMITH_ENV_FILE, "utf8"))
        : {};

      await writeFile(
        DOC_SMITH_ENV_FILE,
        stringify({
          ...existingConfig,
          [hostname]: {
            DOC_DISCUSS_KIT_ACCESS_TOKEN: accessToken,
            DOC_DISCUSS_KIT_URL: DISCUSS_KIT_URL,
          },
        })
      );
    } catch (error) {
      console.error("Failed to get access token:", error);
      throw new Error(
        "Failed to obtain access token. Please check your network connection and try again later."
      );
    }
  }

  return accessToken;
}

/**
 * Save boardId to config.yaml file if it was auto-created
 * @param {string} boardId - The original boardId (may be empty)
 * @param {string} newBoardId - The boardId returned from publishDocsFn
 */
async function saveBoardIdToInput(boardId, newBoardId) {
  // Only save if boardId was auto-created
  if (!boardId && newBoardId) {
    try {
      const docSmithDir = join(process.cwd(), "doc-smith");
      if (!existsSync(docSmithDir)) {
        mkdirSync(docSmithDir, { recursive: true });
      }

      const inputFilePath = join(docSmithDir, "config.yaml");
      let fileContent = "";

      // Read existing file content if it exists
      if (existsSync(inputFilePath)) {
        fileContent = await readFile(inputFilePath, "utf8");
      }

      // Check if boardId already exists in the file
      const boardIdRegex = /^boardId:\s*.*$/m;
      const newBoardIdLine = `boardId: ${newBoardId}`;

      if (boardIdRegex.test(fileContent)) {
        // Replace existing boardId line
        fileContent = fileContent.replace(boardIdRegex, newBoardIdLine);
      } else {
        // Add boardId to the end of file
        if (fileContent && !fileContent.endsWith("\n")) {
          fileContent += "\n";
        }
        fileContent += newBoardIdLine + "\n";
      }

      await writeFile(inputFilePath, fileContent);
      console.log(`Board ID saved to: ${inputFilePath}`);
    } catch (error) {
      console.warn("Failed to save board ID to config.yaml:", error.message);
    }
  }
}

export default async function publishDocs({ docsDir, appUrl, boardId }) {
  const accessToken = await getAccessToken(appUrl);

  process.env.DOC_ROOT_DIR = docsDir;

  const sidebarPath = join(docsDir, "_sidebar.md");

  const boardName = boardId ? "" : getProjectName();

  const { success, boardId: newBoardId } = await publishDocsFn({
    sidebarPath,
    accessToken,
    appUrl,
    boardId,
    // If boardId is empty, use project name as boardName and auto create board
    boardName,
    autoCreateBoard: !boardId,
  });

  // Save boardId to config.yaml if it was auto-created
  await saveBoardIdToInput(boardId, newBoardId);

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
      default:
        // "https://bbqawfllzdt3pahkdsrsone6p3wpxcwp62vlabtawfu.did.abtnet.io",
        "https://www.staging.arcblock.io",
    },
    boardId: {
      type: "string",
      description: "The id of the board",
    },
  },
};

publishDocs.description = "Publish the documentation to Discuss Kit";
