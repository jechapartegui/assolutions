const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { merge } = require('webpack-merge');
const { join } = require('path');

module.exports = (baseConfig) => {
  // 🔧 Corrige le problème ici :
  const extraKeys = ['WEBPACK_BUILD', 'WEBPACK_BUNDLE'];
  extraKeys.forEach(key => delete baseConfig[key]);

  const customConfig = {
    output: {
      path: join(__dirname, 'dist'),
    },
    externals: [
      ...(baseConfig.externals || []),
      ({ request }, callback) => {
        if (request && request.startsWith('@assolutions/')) {
          return callback(); // ne pas externaliser → inclure dans bundle
        }
        return callback(null, undefined);
      }
    ],
    plugins: [
      new NxAppWebpackPlugin({
        target: 'node',
        compiler: 'tsc',
        main: './src/main.ts',
        tsConfig: './tsconfig.app.json',
        assets: ['./src/assets'],
        optimization: false,
        outputHashing: 'none',
        generatePackageJson: true,
      }),
    ],
  };

  return merge(baseConfig, customConfig);
};
