import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveSource } from "./source-config.mjs";

const root = mkdtempSync(path.join(tmpdir(), "source-config-"));
const config = path.join(root, "source.json");
const variable = "SYNTHETIC_SOURCE_DIR";
const previous = process.env[variable];
try {
  delete process.env[variable];
  assert.throws(() => resolveSource("sourceDir", [variable], root, config), /Configure/);
  writeFileSync(config, JSON.stringify({ sourceDir: "private-source" }));
  assert.equal(resolveSource("sourceDir", [variable], root, config), path.join(root, "private-source"));
  writeFileSync(config, "{broken config");
  process.env[variable] = "explicit-source";
  assert.equal(resolveSource("sourceDir", [variable], root, config), path.join(root, "explicit-source"));
  delete process.env[variable];
  writeFileSync(config, JSON.stringify({ sourceDir: "" }));
  assert.throws(() => resolveSource("sourceDir", [variable], root, config), /Configure/);
  console.log("Source selection, isolation, and missing-source checks passed.");
} finally {
  if (previous === undefined) delete process.env[variable]; else process.env[variable] = previous;
  rmSync(root, { recursive: true, force: true });
}
