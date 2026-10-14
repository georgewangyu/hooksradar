import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

export function resolveSource(key, envKeys, root = process.cwd(), configPath = path.join(homedir(), ".config", "hooksradar", "source.json")) {
  for (const envKey of envKeys) {
    const value = process.env[envKey];
    if (typeof value === "string" && value.trim()) return path.resolve(root, value);
  }
  const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf8")) : {};
  const value = config[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Configure ${envKeys[0]} or ~/.config/hooksradar/source.json field ${key} before syncing.`);
  }
  return path.resolve(root, value);
}
