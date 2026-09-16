/**
 * PostgreSQL Database Connection Utilities for HestiaCP Native Environment
 * 
 * Provides functions to safely load and validate PostgreSQL connection details
 * from environment variables for direct local HestiaCP database access (127.0.0.1:5432),
 * completely replacing Docker/container-based networking logic.
 */

export interface PostgresConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl: boolean | 'disable' | 'prefer' | 'require' | 'allow';
  maxConnections?: number;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  applicationName?: string;
  schema?: string;
}

export interface HestiaNamingDetails {
  hestiaUser: string;
  dbSuffix: string;
  userSuffix: string;
  fullDbName: string;
  fullDbUser: string;
}

export interface ConnectionValidationResult {
  isValid: boolean;
  isDockerDetected: boolean;
  isLocalHestia: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Default connection configuration tailored for HestiaCP native installation
 */
export const DEFAULT_HESTIA_POSTGRES_CONFIG: PostgresConnectionConfig = {
  host: '127.0.0.1',
  port: 5432,
  database: 'admin_dvhelp',
  user: 'admin_dvhelp',
  password: '',
  ssl: 'prefer',
  maxConnections: 20,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  applicationName: 'dv-help-app',
  schema: 'public',
};

/**
 * Safely retrieve environment variable across browser Vite (`import.meta.env`)
 * and Node.js (`process.env`) runtime contexts.
 */
export function getEnvVariable(
  key: string,
  fallback: string = '',
  customEnv?: Record<string, string | undefined>
): string {
  if (customEnv && customEnv[key] !== undefined) {
    return customEnv[key] ?? fallback;
  }

  // Check Node.js process.env if available
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return process.env[key] || fallback;
  }

  // Check Vite import.meta.env if available
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv) {
      if (metaEnv[key] !== undefined) {
        return metaEnv[key] || fallback;
      }
      // Check VITE_ prefixed version
      const viteKey = `VITE_${key}`;
      if (metaEnv[viteKey] !== undefined) {
        return metaEnv[viteKey] || fallback;
      }
    }
  } catch {
    // Ignore runtime errors if import.meta is not accessible
  }

  return fallback;
}

/**
 * Parse a standard PostgreSQL connection URI string into structured config object.
 * Supports standard postgres:// and postgresql:// URIs.
 */
export function parsePostgresUri(uri: string): Partial<PostgresConnectionConfig> {
  if (!uri || typeof uri !== 'string') {
    return {};
  }

  try {
    const trimmed = uri.trim();
    // Normalize protocol for URL parser
    const parsedUrl = new URL(
      trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://')
        ? trimmed.replace(/^postgres:\/\//, 'postgresql://')
        : `postgresql://${trimmed}`
    );

    const user = decodeURIComponent(parsedUrl.username || '');
    const password = decodeURIComponent(parsedUrl.password || '');
    const host = parsedUrl.hostname || '127.0.0.1';
    const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 5432;
    const database = parsedUrl.pathname ? parsedUrl.pathname.replace(/^\//, '') : '';
    
    // Parse SSL parameter
    const sslParam = parsedUrl.searchParams.get('sslmode') || parsedUrl.searchParams.get('ssl');
    let ssl: PostgresConnectionConfig['ssl'] = 'prefer';
    if (sslParam === 'disable' || sslParam === 'false') {
      ssl = false;
    } else if (sslParam === 'require' || sslParam === 'true') {
      ssl = 'require';
    } else if (sslParam === 'allow') {
      ssl = 'allow';
    }

    const applicationName = parsedUrl.searchParams.get('application_name') || undefined;

    return {
      host,
      port,
      database: database || undefined,
      user: user || undefined,
      password: password || undefined,
      ssl,
      applicationName,
    };
  } catch {
    return {};
  }
}

/**
 * Loads PostgreSQL connection configuration from environment variables.
 * 
 * Precedence:
 * 1. `DATABASE_URL` / `POSTGRES_URL` connection string
 * 2. Explicit HestiaCP variables (`HESTIA_USER`, `HESTIA_DB_NAME`, `HESTIA_DB_USER`)
 * 3. Standard Postgres variables (`DB_HOST` / `POSTGRES_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`)
 * 4. Default native HestiaCP localhost configuration
 */
export function loadPostgresConfigFromEnv(
  customEnv?: Record<string, string | undefined>
): PostgresConnectionConfig {
  const get = (key: string, fallback = ''): string =>
    getEnvVariable(key, fallback, customEnv);

  // 1. Check if a full DATABASE_URL exists
  const rawDbUrl =
    get('DATABASE_URL') ||
    get('POSTGRES_URL') ||
    get('POSTGRESQL_URL') ||
    get('DB_CONNECTION_STRING');

  let parsedFromUrl: Partial<PostgresConnectionConfig> = {};
  if (rawDbUrl) {
    parsedFromUrl = parsePostgresUri(rawDbUrl);
  }

  // 2. Read Hestia-specific naming conventions
  const hestiaUser = get('HESTIA_USER') || get('HESTIA_CP_USER');
  const hestiaDbSuffix = get('HESTIA_DB_NAME') || get('HESTIA_DB_SUFFIX');
  const hestiaUserSuffix = get('HESTIA_DB_USER') || get('HESTIA_USER_SUFFIX');

  let defaultDbName = DEFAULT_HESTIA_POSTGRES_CONFIG.database;
  let defaultDbUser = DEFAULT_HESTIA_POSTGRES_CONFIG.user;

  if (hestiaUser) {
    if (hestiaDbSuffix) {
      defaultDbName = `${hestiaUser}_${hestiaDbSuffix}`;
    }
    if (hestiaUserSuffix) {
      defaultDbUser = `${hestiaUser}_${hestiaUserSuffix}`;
    }
  }

  // 3. Read host and port with fallback to 127.0.0.1:5432
  const hostVal =
    parsedFromUrl.host ||
    get('POSTGRES_HOST') ||
    get('DB_HOST') ||
    get('PGHOST') ||
    DEFAULT_HESTIA_POSTGRES_CONFIG.host;

  const portRaw =
    parsedFromUrl.port?.toString() ||
    get('POSTGRES_PORT') ||
    get('DB_PORT') ||
    get('PGPORT') ||
    '5432';
  const portVal = parseInt(portRaw, 10) || 5432;

  // 4. Read database name
  const databaseVal =
    parsedFromUrl.database ||
    get('POSTGRES_DB') ||
    get('DB_NAME') ||
    get('PGDATABASE') ||
    defaultDbName;

  // 5. Read user
  const userVal =
    parsedFromUrl.user ||
    get('POSTGRES_USER') ||
    get('DB_USER') ||
    get('PGUSER') ||
    defaultDbUser;

  // 6. Read password
  const passwordVal =
    parsedFromUrl.password ||
    get('POSTGRES_PASSWORD') ||
    get('DB_PASSWORD') ||
    get('PGPASSWORD') ||
    '';

  // 7. Read SSL Mode
  const sslRaw =
    get('POSTGRES_SSL') ||
    get('DB_SSL') ||
    get('PGSSLMODE') ||
    'prefer';

  let sslVal: PostgresConnectionConfig['ssl'] = parsedFromUrl.ssl || 'prefer';
  if (sslRaw === 'false' || sslRaw === 'disable') {
    sslVal = false;
  } else if (sslRaw === 'true' || sslRaw === 'require') {
    sslVal = 'require';
  } else if (sslRaw === 'prefer' || sslRaw === 'allow') {
    sslVal = sslRaw;
  }

  const maxConnRaw = get('DB_MAX_CONNECTIONS') || get('POSTGRES_POOL_SIZE');
  const maxConnections = maxConnRaw ? parseInt(maxConnRaw, 10) : 20;

  return {
    host: hostVal,
    port: portVal,
    database: databaseVal,
    user: userVal,
    password: passwordVal,
    ssl: sslVal,
    maxConnections,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    applicationName: get('APPLICATION_NAME', 'dv-help-app'),
    schema: get('DB_SCHEMA', 'public'),
  };
}

/**
 * Format a PostgresConnectionConfig into standard URI strings for various drivers and ORMs.
 */
export function formatPostgresConnectionString(
  config: PostgresConnectionConfig,
  options: {
    hidePassword?: boolean;
    asyncSqlAlchemy?: boolean;
    syncSqlAlchemy?: boolean;
  } = {}
): string {
  const { host, port, database, user, password, ssl, applicationName } = config;
  const authPass = options.hidePassword
    ? '••••••••'
    : password
    ? encodeURIComponent(password)
    : '';

  const authSection = user ? (authPass ? `${user}:${authPass}@` : `${user}@`) : '';

  let prefix = 'postgresql://';
  if (options.asyncSqlAlchemy) {
    prefix = 'postgresql+asyncpg://';
  } else if (options.syncSqlAlchemy) {
    prefix = 'postgresql+psycopg2://';
  }

  const queryParams: string[] = [];
  if (ssl && ssl !== 'disable') {
    queryParams.push(`sslmode=${ssl}`);
  }
  if (applicationName) {
    queryParams.push(`application_name=${encodeURIComponent(applicationName)}`);
  }

  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

  return `${prefix}${authSection}${host}:${port}/${database}${queryString}`;
}

/**
 * Parse HestiaCP naming prefix/suffix from full database or username.
 * HestiaCP always uses the pattern: <user>_<name>
 */
export function extractHestiaNaming(
  fullDbName: string,
  fullDbUser: string
): HestiaNamingDetails {
  let hestiaUser = 'admin';
  let dbSuffix = fullDbName;
  let userSuffix = fullDbUser;

  if (fullDbName.includes('_')) {
    const parts = fullDbName.split('_');
    hestiaUser = parts[0];
    dbSuffix = parts.slice(1).join('_');
  }

  if (fullDbUser.includes('_')) {
    const parts = fullDbUser.split('_');
    userSuffix = parts.slice(1).join('_');
  }

  return {
    hestiaUser,
    dbSuffix,
    userSuffix,
    fullDbName,
    fullDbUser,
  };
}

/**
 * Validate PostgreSQL connection settings, detecting outdated Docker hosts and recommending native HestiaCP loopback.
 */
export function validatePostgresConnectionConfig(
  config: PostgresConnectionConfig
): ConnectionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const dockerHosts = ['db', 'postgres', 'postgresql', 'docker.for.mac.localhost', 'host.docker.internal'];
  const isDockerDetected = dockerHosts.includes(config.host.toLowerCase());
  const isLocalHestia =
    config.host === '127.0.0.1' ||
    config.host === 'localhost' ||
    config.host === '::1';

  if (!config.host) {
    errors.push('Database host is required.');
  }

  if (!config.database) {
    errors.push('Database name is required.');
  }

  if (!config.user) {
    errors.push('Database user is required.');
  }

  if (isDockerDetected) {
    warnings.push(
      `Host '${config.host}' appears to be a Docker container name. For HestiaCP native hosting, use '127.0.0.1'.`
    );
    recommendations.push(
      "Replace Docker container host with '127.0.0.1' to connect directly to the native HestiaCP PostgreSQL service."
    );
  }

  if (isLocalHestia && !config.database.includes('_')) {
    warnings.push(
      `Database name '${config.database}' does not follow HestiaCP naming convention (<username>_<dbname>). Example: 'admin_dvhelp'.`
    );
  }

  if (isLocalHestia && !config.user.includes('_') && config.user !== 'postgres') {
    warnings.push(
      `Database user '${config.user}' does not follow HestiaCP naming convention (<username>_<dbuser>). Example: 'admin_dvhelp'.`
    );
  }

  if (!config.password) {
    warnings.push('Database password is empty. HestiaCP requires password authentication for database users.');
  }

  return {
    isValid: errors.length === 0,
    isDockerDetected,
    isLocalHestia,
    errors,
    warnings,
    recommendations,
  };
}

/**
 * Generate standard HestiaCP environment variable map suitable for `.env` or systemd service units.
 */
export function generateHestiaEnvironmentMap(
  config: Partial<PostgresConnectionConfig>
): Record<string, string> {
  const merged: PostgresConnectionConfig = {
    ...DEFAULT_HESTIA_POSTGRES_CONFIG,
    ...config,
  };

  const naming = extractHestiaNaming(merged.database, merged.user);
  const databaseUrl = formatPostgresConnectionString(merged);
  const asyncUrl = formatPostgresConnectionString(merged, { asyncSqlAlchemy: true });

  return {
    // Core Direct Local Connection (Native HestiaCP, No Docker)
    NODE_ENV: 'production',
    DB_HOST: merged.host,
    DB_PORT: merged.port.toString(),
    DB_NAME: merged.database,
    DB_USER: merged.user,
    DB_PASSWORD: merged.password || '',
    DB_SSL: typeof merged.ssl === 'boolean' ? (merged.ssl ? 'require' : 'disable') : merged.ssl,

    // Standard PostgreSQL Variables
    POSTGRES_HOST: merged.host,
    POSTGRES_PORT: merged.port.toString(),
    POSTGRES_DB: merged.database,
    POSTGRES_USER: merged.user,
    POSTGRES_PASSWORD: merged.password || '',

    // Connection Strings
    DATABASE_URL: databaseUrl,
    ASYNC_DATABASE_URL: asyncUrl,

    // HestiaCP Naming Breakdown
    HESTIA_USER: naming.hestiaUser,
    HESTIA_DB_NAME: naming.dbSuffix,
    HESTIA_DB_USER: naming.userSuffix,
  };
}

/**
 * Generate the exact psql command line to test or connect to HestiaCP database locally.
 */
export function generatePsqlCliCommand(config: PostgresConnectionConfig): string {
  const passPrefix = config.password ? `PGPASSWORD='${config.password}' ` : '';
  return `${passPrefix}psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database}`;
}

/**
 * Generate standard node-postgres (pg) pool configuration object
 */
export function createNodePgPoolConfig(config: PostgresConnectionConfig): Record<string, any> {
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl:
      config.ssl === 'require' || config.ssl === true
        ? { rejectUnauthorized: false }
        : false,
    max: config.maxConnections || 20,
    connectionTimeoutMillis: config.connectionTimeoutMillis || 10000,
    idleTimeoutMillis: config.idleTimeoutMillis || 30000,
    application_name: config.applicationName || 'dv-help-app',
  };
}
