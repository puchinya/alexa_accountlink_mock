import type { AWS } from '@serverless/typescript';

import oauth2 from '@functions/oauth2';

const serverlessConfiguration: AWS = {
  service: 'alexa-accountlink-mock',
  frameworkVersion: '3',
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
    runtime: 'nodejs16.x',
    architecture: 'arm64',
    memorySize: 256,
    timeout: 28,
    httpApi: {
      payload: '2.0',
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      OPENID_KEYID: 'mock_keyid',
      OPENID_ISSUER: 'moch_service',
      ACCESS_TOKEN_EXPIRES: '3600',
      ID_TOKEN_EXPIRES: '3600'
    },
    lambdaHashingVersion: '20201221',
  },
  // import the function via paths
  functions: { oauth2 },
};

module.exports = serverlessConfiguration;
