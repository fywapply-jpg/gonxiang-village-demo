declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.gif';

declare namespace NodeJS {
  interface ProcessEnv {
    TARO_APP_BACKEND_SYNC?: string;
      TARO_APP_CLOUD_SERVICE?: string;
      TARO_APP_CLOUD_ENV?: string;
  }
}
