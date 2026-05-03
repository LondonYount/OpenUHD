import { writeFileSync } from "fs";
import { renderVisualization } from "./render.js";
import type { ModuleDef } from "../types/module.js";

/**
 * Generate an HTML visualization file for a module and its children.
 */
export function generateVisualization(
  rootModule: ModuleDef,
  childDefs: Record<string, ModuleDef>,
  outputPath: string,
): void {
  const html = renderVisualization(rootModule, childDefs);
  writeFileSync(outputPath, html, "utf-8");
}
