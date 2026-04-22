/**
 * JWT Configuration
 * JWT secret, token expiry, and refresh token settings
 */

export interface JwtConfig {
  secret: string;
  refreshSecret: string;
  accessExpirySeconds: number;
  refreshExpirySeconds: number;
  algorithm: string;
}

export const getJwtConfig = (): JwtConfig => {
  const secret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || secret;

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return {
    secret,
    refreshSecret,
    accessExpirySeconds: parseInt(
      process.env.JWT_ACCESS_EXPIRY || '900', // 15 minutes
      10,
    ),
    refreshExpirySeconds: parseInt(
      process.env.JWT_REFRESH_EXPIRY || '604800', // 7 days
      10,
    ),
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
  };
};

export const validateJwtConfig = (config: JwtConfig): void => {
  if (!config.secret) {
    throw new Error('JWT_SECRET is required');
  }
  if (config.secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  if (config.accessExpirySeconds <= 0) {
    throw new Error('JWT_ACCESS_EXPIRY must be greater than 0');
  }
  if (config.refreshExpirySeconds <= 0) {
    throw new Error('JWT_REFRESH_EXPIRY must be greater than 0');
  }
};
