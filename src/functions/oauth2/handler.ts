import 'source-map-support/register';

import type {APIGatewayProxyEventV2, APIGatewayProxyResultV2} from "aws-lambda"
import {middyfy} from '@libs/lambda';
const jwt = require('jsonwebtoken');
const tojwks = require('rsa-pem-to-jwk');

const DEFAULT_ACCESS_TOKEN_EXPIRES = 3600;
const DEFAULT_ID_TOKEN_EXPIRES = 3600;
const DEFAULT_OPENID_ISSUER = 'mock';
const DEFAULT_OPENID_KEYID = 'mock';
const DEFAULT_TOKEN_PRIVATE_KEY_PEM = "-----BEGIN RSA PRIVATE KEY-----\n" +
    "MIIEpAIBAAKCAQEArPuK1U6B+PDta4NGONxQqYGWZGs5DvIFAWgrX5rQbtscjNMm\n" +
    "11Gpmg8PubADSCn/+pLpUl88pxsAWuMdQb4ULF5rdM0kl/VG5nVv6hVAxXzvVy9S\n" +
    "vLbOkzNnyfPyEd9gWTICz9szXsW7cvn9bwh7xQSTKPxZlIQBcsDuTmcGQq7/w2Y/\n" +
    "ZzeT5g8WTaheYC82fpQz5oUjumOvPqwrThMbuAhratXU0szZNWg29FyjNK7gk2WS\n" +
    "pD9wUZIVOs0+BgfpHaKBWSL2EfQz9sFFznbWgxrV95eXjNRypDcE/uBpSyCA74VG\n" +
    "ktLLgyRBqClerNWSEl+eH24gyR1W126fo/bkrwIDAQABAoIBAG/0nXZQyW4FAKSE\n" +
    "4f4LGWmbpWp4uwUhPnwan3fRCvW0elXqk0joYYyEEvlrIbSi+jmCu9/EI81DfIdW\n" +
    "VqkmDIhq08FUxEpVRP4DI9usxa8LnRwgVLwu1KQQsSvT5ugKWqFf7NH6XNUJxLg1\n" +
    "dAFYzEJHI7dzG8czaHyMwa+cnkCpUdIA00OkckTdsSgaOW4AkAq8475xvNfIb0MZ\n" +
    "aXPLdF+2WblldRQfnV6vvpF+s5sykSYlfIoEZaj9aV6ftunSxTk9sOkerSIdSBOY\n" +
    "LFRcbKYjVNQvc/H2Ei15RW9FGJmPIb9imsqv/8SyKHMWXZZhM2PEW4732GaBrKzI\n" +
    "OHHqUIECgYEA3DjWcLAZcBu4vcLYzofRQrsnW4q9b7QqUGgdAm29uoWeiOTb1GNL\n" +
    "nr5Cgj0fJTSJo+ZAkJC7bcr7LndSVyqy2Hi5V1BCps0/16PAVDAdXt41ZqFfg03q\n" +
    "hDT9WqRZvWpp5c63f+aQBPNmeRrR1HYEQz+S/sU7NuTRi8dQjspRVBsCgYEAyRX9\n" +
    "L70O8WwvMyK9NHFdrJ8iZqFfPu1f27oE/h0kLXdMRz6eRZ3UK7NsN3Xhbsedxmzj\n" +
    "IgsDGCwvE8mzvxwqxjb/5I/IhC64jFAa67+1fWw2GVi0NzHRFq6BG5NXNZdGhQXu\n" +
    "jCtf+PD5F81fjQjDJm2lhEsdJDp4SqNBqukUsv0CgYEAjGisyNJulZ0HL+4gf6X2\n" +
    "1R4wnNwbpjHv3K5U+KxxkJALIWsRghwBJehWzWUdC4Kw01BGECZHalxFxD2NwUfX\n" +
    "Gc/3E+V3aZRpxRqB0OuQfmEdGR+An145TSvf8T/ie7Nya3ReaOzfHFj4F/TyngzU\n" +
    "8O+C0G9+LqS7uexNv4zdR8sCgYA6DH39lP9GVGu/wEyMYhmfpoTAyd78BHyCqs2c\n" +
    "Kf9ynJjJjFsWT7ybLP2VeRMt7rQuPurGvhUTmlWwya55AgGbHO98JMHG3tHpt4o9\n" +
    "+ibDYUSwxnmn4VqxyIh+1Gb9koEKD69QiYj4DWBrLZ9i0F+9rTN14FU2SybErSJc\n" +
    "21JdZQKBgQC0GGKbNdLhb9WaRNvW6+w+UFxek1SRskQh42fX6tkwnqeH9s/qbRzN\n" +
    "ikzGW3jQVa8p3XU6d6JxpFUnSr26Jtkg7u5YzZ3h6ujjgxvmHSq8ejVzDCIoKLHO\n" +
    "la+RQlqzWsiS+spY9V3l7B+ux4z17kgB1vBm90kDGzkFvyEYppXWmQ==\n" +
    "-----END RSA PRIVATE KEY-----\n";

const OPENID_ISSUER = process.env.OPENID_ISSUER || DEFAULT_OPENID_ISSUER;
const OPENID_KEYID = process.env.OPENID_KEYID || DEFAULT_OPENID_KEYID;
const ACCESS_TOKEN_EXPIRES = parseInt(process.env.ACCESS_TOKEN_EXPIRES) || DEFAULT_ACCESS_TOKEN_EXPIRES;
const ID_TOKEN_EXPIRES = parseInt(process.env.ID_TOKEN_EXPIRES) || DEFAULT_ID_TOKEN_EXPIRES;
const TOKEN_PRIVATE_KEY_PEM = process.env.TOKEN_PRIKEY_PEM || DEFAULT_TOKEN_PRIVATE_KEY_PEM
let jwkjson = null;

function makeRedirectResponse(url: string) : any
{
  return {
    statusCode: 303,
    headers: {
      Location: url
    }
  }
}

function makeBadRequestResponse() : any
{
  return {
    statusCode: 400
  }
}

function makeAccessToken(client_id : string, scope : string) : any
{
  const payloadAccessToken = {
    token_use: 'access',
    scope: scope,
    client_id: client_id,
  };
  const accessToken = jwt.sign(payloadAccessToken, TOKEN_PRIVATE_KEY_PEM, {
    algorithm: 'RS256',
    expiresIn: ACCESS_TOKEN_EXPIRES,
    issuer: OPENID_ISSUER,
    subject: client_id,
    keyid: OPENID_KEYID
  });

  return {
    "access_token": accessToken,
    "token_type": "Bearer",
    "expires_in": ACCESS_TOKEN_EXPIRES
  };
}

function make_tokens(client_id, userid, scope, refresh = true){
  const payloadId = {
    token_use: 'id',
    "cognito:username": userid,
    email: userid + '@test.com',
  };

  const idToken = jwt.sign(payloadId, TOKEN_PRIVATE_KEY_PEM, {
    algorithm: 'RS256',
    expiresIn: ID_TOKEN_EXPIRES,
    audience: client_id,
    issuer: OPENID_ISSUER,
    subject: userid,
    keyid: OPENID_KEYID,
  });

  const payloadAccessToken = {
    token_use: 'access',
    scope: scope,
    "cognito:username": userid,
    email: userid + '@test.com',
  };

  const accessToken = jwt.sign(payloadAccessToken, TOKEN_PRIVATE_KEY_PEM, {
    algorithm: 'RS256',
    expiresIn: ACCESS_TOKEN_EXPIRES,
    audience: client_id,
    issuer: OPENID_ISSUER,
    subject: userid,
    keyid: OPENID_KEYID,
  });

  let tokens = {
    access_token : accessToken,
    id_token : idToken,
    token_type : "Bearer",
    expires_in : ACCESS_TOKEN_EXPIRES,
    refresh_token : undefined
  };

  if( refresh ){
    tokens.refresh_token = Buffer.from(client_id + ':' + userid + ':' + scope, 'ascii').toString('hex');
  }

  return tokens;
}

function getBaseUrl(event : APIGatewayProxyEventV2) : string {
  return `https://${event.requestContext.domainName}`;
}

function parseContent(body : string, contentType : string) : any {
  if(contentType == 'application/x-www-form-urlencoded') {
    const items = body.split('&');
    let r = {};
    for(let i = 0; i < items.length; i++) {
      const item = items[i];
      const kv = item.split('=', 2);
      const key = kv[0];
      const value = decodeURIComponent(kv[1]);
      r[key] = value;
    }
    return r;
  } else {
    return JSON.parse(body);
  }
}

function getParsedContent(event : APIGatewayProxyEventV2) : any {
  let body = event.body;
  if (event.isBase64Encoded) {
    let buff = Buffer.from(body, "base64");
    body = buff.toString('utf-8');
  }
  return parseContent(body, event.headers['content-type']);
}

const oauth2_token = async (event : APIGatewayProxyEventV2) : Promise<APIGatewayProxyResultV2> => {

  const params = getParsedContent(event);

  console.log(JSON.stringify(params));

  const grant_type = params['grant_type'];
  if( grant_type == 'authorization_code' || grant_type == "refresh_token"){
    let code;
    if( grant_type == "refresh_token" )
      code = Buffer.from(params['refresh_token'], 'hex').toString('ascii');
    else
      code = Buffer.from(params['code'], 'hex').toString('ascii');
    let code_list = code.split(':');

    const client_id = code_list[0];
    const userid = code_list[1];
    const scope = code_list[2];

    const tokens = make_tokens(client_id, userid, scope, grant_type != "refresh_token" );

    console.log(JSON.stringify(tokens));

    return {
      statusCode: 200,
      body: JSON.stringify(tokens)
    }
  } else if( grant_type == 'client_credentials'){
    const scope = params['scope'];
    const client_id = params['client_id'];

    const tokens = makeAccessToken(client_id, scope);

    return {
      statusCode: 200,
      body: JSON.stringify(tokens)
    }
  } else {
    return {
      statusCode: 400
    }
  }
}

const oauth2_authorize = async (event : APIGatewayProxyEventV2) : Promise<APIGatewayProxyResultV2> => {
  const { client_id, redirect_uri, response_type, scope, state } = event.queryStringParameters;

  const login_url = `${getBaseUrl(event)}/oauth2/ui/login.html`;

  let url = login_url + '?client_id=' + client_id + '&redirect_uri=' + encodeURIComponent(redirect_uri) + '&response_type=' + response_type;
  if( scope )
    url += '&scope=' + encodeURIComponent(scope);
  if( state )
    url += '&state=' + encodeURIComponent(state);

  return makeRedirectResponse(url);
}

const oauth2_authorize_process = async (event : APIGatewayProxyEventV2) : Promise<APIGatewayProxyResultV2> => {
  const { client_id, userid, password, redirect_uri, response_type, scope, state } = event.queryStringParameters;

  if( response_type == 'token'){
    const tokens = make_tokens(client_id, userid, scope);

    let url = redirect_uri + '#id_token=' + tokens.id_token + '&access_token=' + tokens.access_token + '&refresh_token=' + tokens.refresh_token
        + '&token_type=' + tokens.token_type + '&expires_in=' + tokens.expires_in;
    if( state )
      url += '&state=' + decodeURIComponent(state);

    return makeRedirectResponse(url);
  } else if( response_type == 'code') {
    const code = Buffer.from(client_id + ':' + userid + ':' + scope, 'ascii').toString('hex');

    let url = redirect_uri + '?code=' + code;
    if( state )
      url += '&state=' + decodeURIComponent(state);

    return makeRedirectResponse(url);
  }

  return makeBadRequestResponse();
}

const oauth2_userInfo = async (event : APIGatewayProxyEventV2) : Promise<APIGatewayProxyResultV2> => {
  return {
    statusCode: 200,
  }
}

const oauth2_jwks_json = async (event : APIGatewayProxyEventV2) : Promise<APIGatewayProxyResultV2> => {
  if( jwkjson == null ){
    jwkjson = {
      keys: [
        tojwks(TOKEN_PRIVATE_KEY_PEM, {use: 'sig', kid: OPENID_KEYID, alg: 'RS256'}, 'pub')
      ]
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(jwkjson)
  }
}

const oauth2_openid_configuration = async (event : APIGatewayProxyEventV2) : Promise<APIGatewayProxyResultV2> => {
  const base_url = getBaseUrl(event);
  const configjson = {
    authorization_endpoint: base_url + "/oauth2/authorize",
    id_token_signing_alg_values_supported: [
      "RS256"
    ],
    issuer: OPENID_ISSUER,
    jwks_uri: base_url + "/.well-known/jwks.json",
    response_types_supported: [
      "code",
      "token"
    ],
    scopes_supported: [
      "openid",
      "profile"
    ],
    subject_types_supported: [
      "public"
    ],
    token_endpoint: base_url + "/oauth2/token",
    token_endpoint_auth_methods_supported: [
      "client_secret_basic"
    ],
    userinfo_endpoint: base_url + "/oauth2/userInfo"
  };

  return {
    statusCode: 200,
    body: JSON.stringify(configjson)
  }
}

const resource_login_html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src * data: gap: https://ssl.gstatic.com 'unsafe-eval' 'unsafe-inline'; style-src * 'unsafe-inline'; media-src *; img-src * data: content: blob:;">
  <meta name="format-detection" content="telephone=no">
  <meta name="msapplication-tap-highlight" content="no">
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="viewport" content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width">

  <!-- jQuery (necessary for Bootstrap's JavaScript plugins) -->
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js"></script>
  <!-- Latest compiled and minified CSS -->
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
  <!-- Optional theme -->
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap-theme.min.css" integrity="sha384-rHyoN1iRsVXV4nD0JutlnGaslCJuC7uwjduW9SVrLvRYooPp2bWYgmgJQIXwl/Sp" crossorigin="anonymous">
  <!-- Latest compiled and minified JavaScript -->
  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js" integrity="sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa" crossorigin="anonymous"></script>

  <title>Sign In</title>
  
  <script src="https://cdn.jsdelivr.net/npm/vue@2"></script>
</head>
<body>
    <div id="top" class="container">
        <h1>Sign In</h1>

        <form method="get" v-bind:action="authorize_process">
            <label>User Id</label>
            <input type="text" name="userid" class="form-control">
            <label>Password</label>
            <input type="password" name="password" class="form-control">

            <input type="hidden" name="client_id" v-model="client_id">
            <input type="hidden" name="redirect_uri" v-model="redirect_uri">
            <input type="hidden" name="response_type" v-model="response_type">
            <input type="hidden" name="scope" v-model="scope">
            <input type="hidden" name="state" v-model="state">
            <br>
            <button type="submit" class="btn btn-default">Sign In</button> 
        </form>
    </div>

    <script src="js/login.js"></script>
</body>
`;

const resource_login_js = `
var methods_utils = {
    dialog_open: function(target){
        $(target).modal({backdrop:'static', keyboard: false});
    },
    dialog_close: function(target){
        $(target).modal('hide');
    },
    panel_open: function(target){
        $(target).collapse("show");
    },
    panel_close: function(target){
        $(target).collapse("hide");
    },
    progress_open: function(title = '少々お待ちください。'){
        this.progress_title = title;
        this.dialog_open('#progress');
    },
    progress_close: function(){
        this.dialog_close('#progress');
    }
};

var hashs = {};
var searchs = {};

function proc_load() {
  hashs = parse_url_vars(location.hash);
  searchs = parse_url_vars(location.search);
}

function parse_url_vars(param){
    var searchParams = new URLSearchParams(param);
    var vars = {};
    for (let p of searchParams)
        vars[p[0]] = p[1];

    return vars;
}

function vue_add_methods(options, funcs){
    for(var func in funcs){
        options.methods[func] = funcs[func];
    }
}
function vue_add_computed(options, funcs){
    for(var func in funcs){
        options.computed[func] = funcs[func];
    }
}

var base_url = '%BASE_URL%';

var vue_options = {
    el: "#top",
    data: {
        progress_title: '',
        client_id: '',
        redirect_uri: '',
        response_type: '',
        scope: '',
        state: '',
        authorize_process: base_url + '/oauth2/authorize-process'
    },
    computed: {
    },
    methods: {
    },
    created: function(){
    },
    mounted: function(){
        proc_load();
        this.client_id = searchs.client_id;
        this.redirect_uri = searchs.redirect_uri;
        this.response_type = searchs.response_type;
        this.scope = searchs.scope;
        this.state = searchs.state;
    }
};
vue_add_methods(vue_options, methods_utils);
var vue = new Vue( vue_options );
`;

const dispatch = async (event: APIGatewayProxyEventV2) : Promise<APIGatewayProxyResultV2> => {
  console.log(JSON.stringify(event));
  switch(event.rawPath) {
    case "/oauth2/token":
      return await oauth2_token(event);
    case "/oauth2/authorize":
      return await oauth2_authorize(event);
    case "/oauth2/authorize-process":
      return await oauth2_authorize_process(event);
    case "/oauth2/userInfo":
      return await oauth2_userInfo(event);
    case "/oauth2/ui/login.html":
      return {
        statusCode: 200,
        headers: {
          'content-type': 'text/html'
        },
        body: resource_login_html
      }
    case "/oauth2/ui/js/login.js":
      return {
        statusCode: 200,
        headers: {
          'content-type': 'text/javascript'
        },
        body: resource_login_js.replace("%BASE_URL%",
            `https://${event.requestContext.domainName}`)
      }
    case '/.well-known/jwks.json':
      return await oauth2_jwks_json(event);
    case '/.well-known/openid-configuration':
      return await oauth2_openid_configuration(event);
    default:
      return {
        statusCode: 404
      }
  }
}

export const main = middyfy(dispatch);
