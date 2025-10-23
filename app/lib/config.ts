export const AUTH_CONFIG = {
  COOKIE_NAME: "auth-token",
  COOKIE_MAX_AGE: 60 * 60 * 24 * 7, // 7 days
  JWT_EXPIRES_IN: "7d",
  JWT_SECRET: process.env.JWT_SECRET,
  BCRYPT_ROUNDS: 12,
} as const;
