export const AUTH_CONFIG = {
  COOKIE_NAME: "auth-token",
  COOKIE_MAX_AGE: 60 * 60 * 24 * 7, // 7 days
  JWT_EXPIRES_IN: "7d",
  JWT_SECRET: process.env.JWT_SECRET,
  BCRYPT_ROUNDS: 12,
} as const;

export const DATABASE_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
} as const;
