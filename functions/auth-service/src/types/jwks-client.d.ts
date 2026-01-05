declare module 'jwks-client' {
  interface JwksClient {
    getSigningKey(
      kid: string
    ): Promise<{ publicKey: string; rsaPublicKey: string }>;
  }

  interface ClientOptions {
    jwksUri: string;
    requestHeaders?: Record<string, string>;
    timeout?: number;
    cache?: boolean;
    rateLimit?: boolean;
    jwksRequestsPerMinute?: number;
    cacheMaxEntries?: number;
    cacheMaxAge?: number;
  }

  function JwksClient(options: ClientOptions): JwksClient;
  export = JwksClient;
}
