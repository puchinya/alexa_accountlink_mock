//import schema from './schema';
import { handlerPath } from '@libs/handlerResolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      httpApi: 'GET /oauth2/authorize'
    },
    {
      httpApi: 'GET /oauth2/authorize-process'
    },
    {
      httpApi: 'POST /oauth2/token'
    },
    {
      httpApi: 'GET /oauth2/userInfo'
    },
    {
      httpApi: 'GET /oauth2/ui/js/login.js'
    },
    {
      httpApi: 'GET /oauth2/ui/login.html'
    },
    {
      httpApi: 'GET /.well-known/jwks.json'
    },
    {
      httpApi: 'GET /.well-known/openid-configuration'
    }
  ]
}
