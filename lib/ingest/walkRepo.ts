import glob from "fast-glob";
import path from "path";

//using fast-glob to efficiently recurse down the file trees
//ignoring node_modules, git, next, dist, build, vs code, package-lock.json, yarn.lock, gitignore, env, env.*
//ignoring media files, archives, and images

export const walkRepo = async (dir: string): Promise<string[]> => {

  // 1. Validate the directory path
  // We want to make sure it's an absolute path or resolve it relative to cwd
  const rootDir = path.resolve(dir);

  console.log(`Scanning directory: ${rootDir}`);

  // 2. Use fast-glob to find all files
  // Patterns:
  // **/* matches all files recursively
  const entries = await glob("**/*", {
    cwd: rootDir,
    absolute: true,
    onlyFiles: true,
    ignore: [
      "**/node_modules/**",
      "**/.git/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/.vscode/**",
      "**/.idea/**",
      "**/target/**",
      "**/bin/**",
      "**/obj/**",
      "**/venv/**",
      "**/.venv/**",
      "**/__pycache__/**",
      "**/package-lock.json",
      "**/yarn.lock",
      "**/pnpm-lock.yaml",
      "**/.gitignore",
      "**/.env",
      "**/.env.*",

      //we don't want to save media files        
      "**/*.png",
      "**/*.jpg",
      "**/*.jpeg",
      "**/*.svg",
      "**/*.ico",
      "**/*.mp4",
      "**/*.zip",
      "**/*.tar",
      "**/*.gz",
      "**/*.pdf",
      "**/*.exe",
      "**/*.dll",
      "**/*.iso",
    ],
  });

  return entries;
};
