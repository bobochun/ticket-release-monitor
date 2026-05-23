import "dotenv/config";
import { initDb } from "../src/server/db.js";
import { checkTarget, createBrowser } from "../src/server/checker.js";
import { listTargets, markTargetChecked } from "../src/server/targets.js";
import { saveCheckRun } from "../src/server/runs.js";
import { notifyCheckResult } from "../src/server/notifications.js";

initDb();

const browser = await createBrowser();
try {
  for (const target of listTargets().filter((item) => item.enabled)) {
    const result = await checkTarget(target, browser);
    saveCheckRun(result);
    markTargetChecked(target.id, target.checkIntervalSeconds);
    await notifyCheckResult(result);
    console.log(`${target.name}: ${result.status} - ${result.message}`);
  }
} finally {
  await browser.close().catch(() => undefined);
}
