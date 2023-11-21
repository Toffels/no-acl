import fs from "fs";
import path from "path";

function listFilesRecursively(
  basePath: string,
  pattern: RegExp,
  fileList: string[] = []
): string[] {
  const items = fs.readdirSync(basePath);

  items.forEach((item) => {
    const itemPath = path.join(basePath, item);
    const itemStats = fs.lstatSync(itemPath);

    if (itemStats.isDirectory()) {
      // Recursively search in this directory
      listFilesRecursively(itemPath, pattern, fileList);
    } else if (itemStats.isFile() && pattern.test(item)) {
      // If it's a file and it matches the pattern, add it to the list
      fileList.push(itemPath);
    }
  });

  return fileList;
}

function createDirectoriesForFiles(filePaths: string[]): void {
  const uniqueDirectories = new Set<string>();

  // Collect all unique directories from the file paths
  filePaths.forEach((filePath) => {
    uniqueDirectories.add(path.dirname(filePath));
  });

  // Create each directory
  uniqueDirectories.forEach((dirPath) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
}

function cleanup(dirPath: string): void {
  let items: string[] = [];
  try {
    items = fs.readdirSync(dirPath);
  } catch (err) {
    console.error(`Failed to read the directory: ${dirPath}`, err);
    return;
  }

  items.forEach((item) => {
    const fullPath = path.join(dirPath, item);
    if (fs.statSync(fullPath).isDirectory()) {
      cleanup(fullPath);
    }
  });

  try {
    items = fs.readdirSync(dirPath);
  } catch (err) {
    console.error(`Failed to read the directory: ${dirPath}`, err);
    return;
  }

  if (items.length === 0) {
    try {
      fs.rmdirSync(dirPath);
      // console.log(`Deleted empty directory: ${dirPath}`);
    } catch (err) {
      console.error(`Failed to delete the directory: ${dirPath}`, err);
    }
  }
}

const moves: { from: string; to: string; pattern: RegExp }[] = [
  {
    from: "./dist",
    to: "./dist/types",
    pattern: /\.d\.ts$/,
  },
];

moves.forEach((move) => {
  const foundFiles = listFilesRecursively(move.from, move.pattern);
  const absolutePaths = foundFiles.map((f) => path.resolve(__dirname, f));
  const newPaths = absolutePaths.map((f) =>
    path.resolve(
      __dirname,
      f.replace(
        path.resolve(__dirname, move.from),
        path.resolve(__dirname, move.to)
      )
    )
  );

  createDirectoriesForFiles(newPaths);

  absolutePaths.forEach((file, index) => {
    fs.renameSync(file, newPaths[index]);
  });

  cleanup(move.from);
});

const mainPackageJson = fs.readFileSync(
  path.join(__dirname, "package.json"),
  "utf-8"
);
const mainJson = JSON.parse(mainPackageJson);

const packageJson = fs.readFileSync(
  path.join(__dirname, "dist", "package.json"),
  "utf-8"
);
const json = JSON.parse(packageJson);
json.version = mainJson.version;
json.dependencies = mainJson.dependencies;
