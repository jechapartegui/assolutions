console.log('[dev] register-tsconfig-paths loaded'); // ← tu DOIS voir cette ligne au boot
const tsConfigPaths = require('tsconfig-paths');
const path = require('path');

const tsConfigPath = path.resolve(__dirname, 'tsconfig.dev.json');
const config = tsConfigPaths.loadConfig(tsConfigPath);

if (config.resultType === 'failed') {
  console.error('Could not load tsconfig:', config.message);
} else {
  tsConfigPaths.register({
    baseUrl: config.absoluteBaseUrl,
    paths: config.paths,
  });
}
