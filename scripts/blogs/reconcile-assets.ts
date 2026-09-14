import { AssetReconciler } from '../../src/modules/blogs/assets/asset-reconciler';
import { runCli, parseArgs } from '../api-keys/_bootstrap';

const args = parseArgs(process.argv.slice(2));

void runCli('AssetReconciler', async (app) => {
  const report = await app.get(AssetReconciler).reconcile({
    dryRun: args.delete !== true,
  });
  console.log(JSON.stringify(report, null, 2));
});
