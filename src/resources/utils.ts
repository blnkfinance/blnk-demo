import { join, dirname } from "path";
import { fileURLToPath } from "url";

// General utility functions
// Add general utility functions here as needed across multiple demos

/**
 * Gets the output directory path for a demo.
 * Output files should be saved to output/ directory within each demo directory.
 * 
 * @param importMetaUrl - The import.meta.url from the calling file (e.g., import.meta.url)
 * @returns The absolute path to the output directory
 */
export function getOutputDir(importMetaUrl: string): string {
    const __filename = fileURLToPath(importMetaUrl);
    const __dirname = dirname(__filename);
    // Assuming the demo file is in src/demos/<demo-name>/index.ts
    // We want output/ in src/demos/<demo-name>/output/
    return join(__dirname, "output");
}

/**
 * Ensures the output directory exists, creating it if necessary.
 * 
 * @param importMetaUrl - The import.meta.url from the calling file (e.g., import.meta.url)
 * @returns The absolute path to the output directory
 */
export async function ensureOutputDir(importMetaUrl: string): Promise<string> {
    const outputDir = getOutputDir(importMetaUrl);
    try {
        await Bun.write(join(outputDir, ".gitkeep"), "");
    } catch {
        // Directory might already exist, try to create it
        await Bun.write(join(outputDir, ".gitkeep"), "");
    }
    return outputDir;
}
