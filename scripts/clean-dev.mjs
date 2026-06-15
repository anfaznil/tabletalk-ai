import fs from "fs";
import path from "path";

const projectRoot = process.cwd();
const nextDir = path.join(projectRoot, ".next");

if (fs.existsSync(nextDir)) {
  const trashName = `.next-trash-${Date.now()}`;
  fs.renameSync(nextDir, path.join(projectRoot, trashName));
  console.log(`Moved ${nextDir} to ${trashName}`);
}
