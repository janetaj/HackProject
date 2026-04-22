/**
 * Database Configuration
 * PostgreSQL connection settings and pool configuration
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  pool: {
    min: number;
    max: number;
  };
  ssl: boolean | { rejectUnauthorized: boolean };
  logging: boolean;
  entities: string[];
  migrations: string[];
  subscribers: string[];
  synchronize: boolean;
}

export const getDatabaseConfig = (): DatabaseConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isSupabase = process.env.DB_HOST?.includes('supabase.co');

  // Configure SSL based on environment
  let sslConfig: boolean | { rejectUnauthorized: boolean } = process.env.DB_SSL === 'true';
  if (isSupabase) {
    sslConfig = {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' ? true : false,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'testgen_app',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'testgen',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    },
    ssl: sslConfig,
    logging: nodeEnv === 'development',
    entities: ['dist/**/*.entity{.ts,.js}'],
    migrations: ['dist/migrations/*{.ts,.js}'],
    subscribers: ['dist/subscribers/*{.ts,.js}'],
    synchronize: false, // Disabled to prevent schema conflicts with existing database
  };
};

export const validateDatabaseConfig = (config: DatabaseConfig): void => {
  if (!config.host) {
    throw new Error('DB_HOST is required');
  }
  if (!config.port) {
    throw new Error('DB_PORT is required');
  }
  if (!config.username) {
    throw new Error('DB_USER is required');
  }
  if (!config.database) {
    throw new Error('DB_NAME is required');
  }
};
