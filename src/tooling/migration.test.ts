import { describe, expect, test } from "vite-plus/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("tooling migration", () => {
  test("package scripts and playwright config use Vite+ commands", () => {
    const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
      packageManager?: string;
      scripts: Record<string, string>;
    };
    const playwrightConfig = readFileSync(path.join(repoRoot, "playwright.config.ts"), "utf8");

    expect(packageJson.packageManager).toMatch(/^npm@/);
    expect(packageJson.scripts.dev).toBe("vp dev");
    expect(packageJson.scripts.build).toBe("vp build");
    expect(packageJson.scripts.preview).toBe("vp preview");
    expect(packageJson.scripts.check).toBe("vp check");
    expect(packageJson.scripts.test).toBe("vp test");
    expect(playwrightConfig).toContain('command: "npx vp dev --host 127.0.0.1 --port 5173"');
  });
});
