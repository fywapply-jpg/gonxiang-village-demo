import { defineConfig } from '@tarojs/cli';

// 小程序与 H5 输出到不同目录，避免互相覆盖（微信开发者工具始终指向 dist）
const isH5 = process.env.TARO_ENV === 'h5';
const backendSyncEnabled = process.env.TARO_APP_BACKEND_SYNC === 'true';
const cloudService = process.env.TARO_APP_CLOUD_SERVICE || 'gonxiang-api';
const cloudEnv = process.env.TARO_APP_CLOUD_ENV || '';

module.exports = defineConfig({
  projectName: 'gonxiang-miniapp',
  date: '2024-1-1',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
    375: 2,
  },
  sourceRoot: 'src',
  outputRoot: isH5 ? 'dist-h5' : 'dist',
  plugins: [],
  defineConstants: {
    'process.env.TARO_APP_BACKEND_SYNC': JSON.stringify(backendSyncEnabled ? 'true' : 'false'),
    'process.env.TARO_APP_CLOUD_SERVICE': JSON.stringify(cloudService),
    'process.env.TARO_APP_CLOUD_ENV': JSON.stringify(cloudEnv),
  },
  copy: {
    patterns: [
      { from: 'src/assets/', to: isH5 ? 'dist-h5/assets/' : 'dist/assets/' }
    ],
    options: {},
  },
  framework: 'react',
  compiler: 'webpack5',
  cache: { enable: false },
  mini: {
    postcss: {
      pxtransform: { enable: true, config: {} },
      url: { enable: true, config: { limit: 1024 } },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
  },
  h5: {
    // 使用相对公共路径：演示版部署在 /demo/ 子目录时，
    // 懒加载页面、CSS 和图片都从当前目录读取，避免误去网站根目录造成白屏。
    publicPath: './',
    staticDirectory: 'static',
    esnextModules: [],
    postcss: {
      autoprefixer: { enable: true, config: {} },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
  },
});
