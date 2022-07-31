import type { AWS } from '@serverless/typescript';

import oauth2 from '@functions/oauth2';

const serverlessConfiguration: AWS = {
  service: 'alexa-accountlink-mock',
  frameworkVersion: '2',
  custom: {
    webpack: {
      webpackConfig: './webpack.config.js',
      includeModules: true,
    },
  },
  plugins: ['serverless-webpack'],
  provider: {
    name: 'aws',
    stage: 'prod',
    region: 'ap-northeast-1',
    profile: 'default',
    runtime: 'nodejs14.x',
    httpApi: {
      payload: '2.0',
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    },
    lambdaHashingVersion: '20201221',
  },
  // import the function via paths
  functions: { oauth2 },
};

module.exports = serverlessConfiguration;
