declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    IAS_ADMIN_PASSWORD_HASH?: string;
    IAS_ADMIN_SESSION_KEY?: string;
  }
}
