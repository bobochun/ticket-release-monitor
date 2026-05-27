import "dotenv/config";
import { checkTarget } from "../src/server/checker";
import { notifyCheckResult } from "../src/server/notifications";
import { saveCheckRun } from "../src/server/runs";
import { getTarget, listTargets, markTargetChecked } from "../src/server/targets";

const idArg = process.argv[2];
const target = idArg ? await getTarget(Number(idArg)) : (await listTargets()).find((item) => item.enabled);

if (!target) {
  console.error("No target found. Run npm run seed or pass a target id.");
  process.exitCode = 1;
} else {
  const result = await checkTarget(target);
  await saveCheckRun(result);
  await markTargetChecked(target.id, target.checkIntervalSeconds);
  await notifyCheckResult(result);
  console.log(JSON.stringify(result, null, 2));
}
