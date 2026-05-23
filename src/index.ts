import "dotenv/config";
import { loadConfig } from "./config.js";
import { checkTarget, createBrowser, sleep } from "./monitor.js";
import { createNotifier } from "./notifier.js";
import type { TargetConfig } from "./types.js";

const mode = process.argv[2] ?? "check";
const configPath = process.argv[3] ?? "config/targets.yml";

async function runOnce(targets: TargetConfig[]): Promise<void> {
  const browser = await createBrowser();
  const notifier = createNotifier();

  try {
    for (const target of targets) {
      const result = await checkTarget(browser, target);

      console.log(
        `[${result.checkedAt}] ${result.targetName}: ${result.status} - ${result.message}`
      );

      if (
        result.status === "AVAILABLE" ||
        result.status === "CAPTCHA_OR_BOT_CHECK" ||
        result.status === "ERROR"
      ) {
        await notifier.notify(result);
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
}

async function watch(targets: TargetConfig[]): Promise<void> {
  const enabledTargets = targets.filter((target) => target.enabled);

  if (enabledTargets.length === 0) {
    console.log("No enabled targets.");
    return;
  }

  console.log("Starting watch mode. Press Ctrl+C to stop.");
  console.log("This tool does not bypass CAPTCHA and does not automate purchases.");

  while (true) {
    await runOnce(enabledTargets);

    const shortestInterval = Math.min(
      ...enabledTargets.map((target) => target.checkIntervalSeconds)
    );

    const safeInterval = Math.max(shortestInterval, 60);
    console.log(`Next check in ${safeInterval} seconds...`);
    await sleep(safeInterval * 1000);
  }
}

async function main(): Promise<void> {
  const config = loadConfig(configPath);

  if (mode === "check") {
    await runOnce(config.targets);
    return;
  }

  if (mode === "watch") {
    await watch(config.targets);
    return;
  }

  throw new Error(`Unknown mode: ${mode}. Use "check" or "watch".`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
