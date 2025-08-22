console.log('[dev] register-tsconfig-paths loaded'); // ← tu DOIS voir cette ligne au boot
const tsConfigPaths = require('tsconfig-paths');
const path = require('path');
const tsconfig = require('./tsconfig.dev.json');

tsConfigPaths.register({
  baseUrl: path.resolve(__dirname, tsconfig.compilerOptions.baseUrl || '.'),
  paths: tsconfig.compilerOptions.paths || {},
});
