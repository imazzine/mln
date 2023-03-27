import { config } from "dotenv";

config();

/**
 * Environment variables object.
 */
export const Env = {
  /******************************************************************
   * Protocol                                                       *
   ******************************************************************/

  /**
   * Protocol name.
   */
  PROTOCOL: process.env.MLN_PROTOCOL
    ? process.env.MLN_PROTOCOL
    : "mln.io",

  /**
   * Protocol version.
   */
  VERSION: process.env.MLN_VERSION
    ? process.env.MLN_VERSION
    : "0.0.0",

  /******************************************************************
   * FS                                                             *
   ******************************************************************/

  /**
   * Tenants files relative path.
   */
  TENANTS_PATH: process.env.MLN_TENANTS_PATH
    ? process.env.MLN_TENANTS_PATH
    : "./tenants",

  /**
   * Tenant keys relative path.
   */
  TENANT_KEYS_PATH: process.env.MLN_TENANT_KEYS_PATH
    ? process.env.MLN_TENANT_KEYS_PATH
    : "./keys",

  /**
   * Tenant private key name.
   */
  TENANT_KEY_NAME: process.env.MLN_TENANT_KEY_NAME
    ? process.env.MLN_TENANT_KEY_NAME
    : "key",

  /**
   * Tenant public key name.
   */
  TENANT_PUB_NAME: process.env.MLN_TENANT_PUB_NAME
    ? process.env.MLN_TENANT_PUB_NAME
    : "key.pub",

  /******************************************************************
   * Authorization/Encription/Session                               *
   ******************************************************************/

  /**
   * Keys import encription algorithm.
   */
  KEYS_IMPORT_ALG: process.env.MLN_KEYS_IMPORT_ALG
    ? process.env.MLN_KEYS_IMPORT_ALG
    : "ES256",

  /**
   * Session request timeout in ms.
   */
  SES_REQ_TIMEOUT: process.env.MLN_SES_REQ_TIMEOUT
    ? parseInt(process.env.MLN_SES_REQ_TIMEOUT)
    : 2000,

  /**
   * Session request "sub" claim value.
   */
  SES_REQ_SUB: process.env.MLN_SES_REQ_SUB
    ? process.env.MLN_SES_REQ_SUB
    : "session::bearer",

  /**
   * Session token "sub" claim value.
   */
  SES_TKN_SUB: process.env.MLN_SES_TKN_SUB
    ? process.env.MLN_SES_TKN_SUB
    : "session::access",

  /**
   * Session token time to live in ms.
   */
  SES_TKN_TTL: process.env.MLN_SES_TKN_TTL
    ? parseInt(process.env.MLN_SES_TKN_TTL)
    : 1000,

  /**
   * Session token algorithm header.
   */
  SES_TKN_ALG: process.env.MLN_SES_TKN_ALG
    ? process.env.MLN_SES_TKN_ALG
    : "RSA-OAEP-256",

  /**
   * Session token algorithm encoding header.
   */
  SES_TKN_ENC: process.env.MLN_SES_TKN_ENC
    ? process.env.MLN_SES_TKN_ENC
    : "A256GCM",

  /******************************************************************
   * Extenal port                                                   *
   ******************************************************************/

  /**
   * External port name.
   */
  EXT_NAME: process.env.MLN_EXT_NAME
    ? process.env.MLN_EXT_NAME
    : "localhost",

  /**
   * External port number.
   */
  EXT_PORT: process.env.MLN_EXT_PORT
    ? parseInt(process.env.MLN_EXT_PORT)
    : 8080,

  /**
   * Maximum length of received message. If a client tries to send you
   * a message larger than this, the connection is immediately closed.
   * Defaults to 16 * 1024.
   */
  EXT_PAYLOAD_LENGTH: process.env.MLN_EXT_PAYLOAD_LENGTH
    ? parseInt(process.env.MLN_EXT_PAYLOAD_LENGTH)
    : 16 * 1024,

  /**
   * Maximum amount of seconds that may pass without sending or
   * getting a message. Connection is closed if this timeout passes.
   * Resolution (granularity) for timeouts are typically 4 seconds,
   * rounded to closest. Disable by using 0. Defaults to 120.
   */
  EXT_IDLE_TIMEOUT: process.env.MLN_EXT_IDLE_TIMEOUT
    ? parseInt(process.env.MLN_EXT_IDLE_TIMEOUT)
    : 120,
};
