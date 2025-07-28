import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

/**
 * Guide users through multi-turn dialogue to collect information and generate YAML configuration
 * @param {Object} params
 * @param {string} params.outputPath - Output file path
 * @param {string} params.fileName - File name
 * @returns {Promise<Object>}
 */
export default async function init(
  { outputPath = "./doc-smith", fileName = "input2.yaml" },
  options
) {
  console.log("Welcome to AIGNE Doc Smith!");
  console.log(
    "I will help you generate a configuration file through several questions.\n"
  );

  // Collect user information
  const input = {};

  // 1. Document generation rules
  console.log("=== Document Generation Rules ===");
  const rulesInput = await options.prompts.input({
    message: "Please describe the document generation rules and requirements:",
  });
  input.rules = rulesInput.trim();

  // 2. Target audience
  console.log("\n=== Target Audience ===");
  const targetAudienceInput = await options.prompts.input({
    message:
      "What is the target audience? (e.g., developers, users, press Enter to skip):",
  });
  input.targetAudience = targetAudienceInput.trim() || "";

  // 3. Language settings
  console.log("\n=== Language Settings ===");
  const localeInput = await options.prompts.input({
    message: "Primary language (e.g., en, zh, press Enter to skip):",
  });
  input.locale = localeInput.trim() || "";

  // 4. Translation languages
  console.log("\n=== Translation Settings ===");
  const translateInput = await options.prompts.input({
    message:
      "Translation language list (comma-separated, e.g., zh,en, press Enter to skip):",
  });
  input.translateLanguages = translateInput.trim()
    ? translateInput.split(",").map((lang) => lang.trim())
    : [];

  // Generate YAML content
  const yamlContent = generateYAML(input, outputPath);

  // Save file
  try {
    const filePath = join(outputPath, fileName);
    const dirPath = dirname(filePath);

    // Create directory if it doesn't exist
    await mkdir(dirPath, { recursive: true });

    await writeFile(filePath, yamlContent, "utf8");
    console.log(`\n✅ Configuration file saved to: ${filePath}`);

    return {
      inputGeneratorStatus: true,
      inputGeneratorPath: filePath,
      inputGeneratorContent: yamlContent,
    };
  } catch (error) {
    console.error(`❌ Failed to save configuration file: ${error.message}`);
    return {
      inputGeneratorStatus: false,
      inputGeneratorError: error.message,
    };
  }
}

/**
 * Generate YAML configuration content
 * @param {Object} input - Input object
 * @param {string} outputPath - Output path for directory configuration
 * @returns {string} YAML string
 */
function generateYAML(input, outputPath) {
  let yaml = "";

  // Add rules
  if (input.rules) {
    yaml += `rules: |\n`;
    yaml += `  ${input.rules.split("\n").join("\n  ")}\n\n`;
  }

  // Add target audience
  if (input.targetAudience && input.targetAudience.trim()) {
    yaml += `targetAudience: ${input.targetAudience}\n`;
  } else {
    yaml += `# targetAudience: developers  # Target audience for the documentation (e.g., developers, users)\n`;
  }

  // Add language settings
  if (input.locale && input.locale.trim()) {
    yaml += `locale: ${input.locale}\n`;
  } else {
    yaml += `# locale: en  # Primary language for the documentation (e.g., en, zh)\n`;
  }

  // Add translation languages
  if (
    input.translateLanguages &&
    input.translateLanguages.length > 0 &&
    input.translateLanguages.some((lang) => lang.trim())
  ) {
    yaml += `translateLanguages:\n`;
    input.translateLanguages.forEach((lang) => {
      if (lang.trim()) {
        yaml += `  - ${lang}\n`;
      }
    });
  } else {
    yaml += `# translateLanguages:  # List of languages to translate the documentation to\n`;
    yaml += `#   - zh  # Example: Chinese translation\n`;
    yaml += `#   - en  # Example: English translation\n`;
  }

  // Add default directory and source path configurations
  yaml += `docsDir: ${outputPath}/docs  # Directory to save generated documentation\n`;
  yaml += `outputDir: ${outputPath}/output  # Directory to save output files\n`;
  yaml += `sourcesPath:  # Source code paths to analyze\n`;
  yaml += `  - ./  # Current directory\n`;

  return yaml;
}

// Execute the function if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  inputGenerator({}).catch(console.error);
}
