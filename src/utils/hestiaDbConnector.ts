/**
 * HestiaCP Native PostgreSQL Database Connector & Migration Module
 * 
 * Replaces Docker-based container configurations with direct connections to local
 * PostgreSQL instances managed natively by HestiaCP (via v-add-database and standard loopback/socket).
 */

import { Applicant } from '../types';

export interface HestiaDbConfig {
  host: string;
  port: number;
  hestiaUser: string;
  dbNameShort: string;
  dbUserShort: string;
  password?: string;
  sslMode: 'disable' | 'prefer' | 'require' | 'allow';
  dbEngine: 'pgsql' | 'mysql';
}

export interface HestiaConnectionStrings {
  standardUri: string;
  asyncSqlAlchemy: string;
  syncSqlAlchemy: string;
  nodePgConfig: {
    host: string;
    port: number;
    database: string;
    user: string;
    password?: string;
    ssl: boolean;
  };
  psqlCliCommand: string;
  hestiaCliCreateCommand: string;
  fullDbName: string;
  fullDbUser: string;
}

export interface DatabaseSyncResult {
  success: boolean;
  message: string;
  timestamp: string;
  syncedCount?: number;
  details?: Record<string, any>;
}

export const DEFAULT_HESTIA_DB_CONFIG: HestiaDbConfig = {
  host: '127.0.0.1',
  port: 5432,
  hestiaUser: 'admin',
  dbNameShort: 'dvhelp',
  dbUserShort: 'dvhelp',
  password: '',
  sslMode: 'prefer',
  dbEngine: 'pgsql',
};

/**
 * Format database or user name according to HestiaCP standard convention (${user}_${name})
 */
export function formatHestiaIdentifier(hestiaUser: string, shortName: string): string {
  const cleanUser = hestiaUser.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanName = shortName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!cleanUser) return cleanName || 'dvhelp';
  if (cleanName.startsWith(`${cleanUser}_`)) return cleanName;
  return `${cleanUser}_${cleanName}`;
}

/**
 * Generate standard connection strings for local HestiaCP PostgreSQL
 */
export function generateHestiaDbConnectionStrings(config: Partial<HestiaDbConfig> = {}): HestiaConnectionStrings {
  const cfg: HestiaDbConfig = { ...DEFAULT_HESTIA_DB_CONFIG, ...config };
  const fullDbName = formatHestiaIdentifier(cfg.hestiaUser, cfg.dbNameShort);
  const fullDbUser = formatHestiaIdentifier(cfg.hestiaUser, cfg.dbUserShort);
  const pass = cfg.password || 'YOUR_PASSWORD';
  const encodedPass = encodeURIComponent(pass);

  const standardUri = `postgresql://${fullDbUser}:${encodedPass}@${cfg.host}:${cfg.port}/${fullDbName}?sslmode=${cfg.sslMode}`;
  const asyncSqlAlchemy = `postgresql+asyncpg://${fullDbUser}:${encodedPass}@${cfg.host}:${cfg.port}/${fullDbName}`;
  const syncSqlAlchemy = `postgresql+psycopg2://${fullDbUser}:${encodedPass}@${cfg.host}:${cfg.port}/${fullDbName}`;

  const psqlCliCommand = `PGPASSWORD="${pass}" psql -h ${cfg.host} -p ${cfg.port} -U "${fullDbUser}" -d "${fullDbName}"`;
  const hestiaCliCreateCommand = `/usr/local/hestia/bin/v-add-database "${cfg.hestiaUser}" "${cfg.dbNameShort}" "${cfg.dbUserShort}" "${pass}" "${cfg.dbEngine}"`;

  return {
    standardUri,
    asyncSqlAlchemy,
    syncSqlAlchemy,
    nodePgConfig: {
      host: cfg.host,
      port: cfg.port,
      database: fullDbName,
      user: fullDbUser,
      password: cfg.password,
      ssl: cfg.sslMode === 'require',
    },
    psqlCliCommand,
    hestiaCliCreateCommand,
    fullDbName,
    fullDbUser,
  };
}

/**
 * Replace legacy Docker environment variables with standard local HestiaCP connection strings
 */
export function replaceDockerEnvWithHestiaLocal(
  rawEnvContent: string,
  config: Partial<HestiaDbConfig> = {}
): string {
  const cfg: HestiaDbConfig = { ...DEFAULT_HESTIA_DB_CONFIG, ...config };
  const conn = generateHestiaDbConnectionStrings(cfg);

  let updated = rawEnvContent;

  // Replace Docker hostnames with 127.0.0.1
  updated = updated.replace(/^POSTGRES_HOST=.*$/gm, `POSTGRES_HOST=${cfg.host}`);
  updated = updated.replace(/^POSTGRES_PORT=.*$/gm, `POSTGRES_PORT=${cfg.port}`);
  updated = updated.replace(/^POSTGRES_DB=.*$/gm, `POSTGRES_DB=${conn.fullDbName}`);
  updated = updated.replace(/^DB_NAME=.*$/gm, `DB_NAME=${conn.fullDbName}`);
  updated = updated.replace(/^POSTGRES_USER=.*$/gm, `POSTGRES_USER=${conn.fullDbUser}`);
  updated = updated.replace(/^DB_USER=.*$/gm, `DB_USER=${conn.fullDbUser}`);
  
  if (cfg.password) {
    updated = updated.replace(/^POSTGRES_PASSWORD=.*$/gm, `POSTGRES_PASSWORD=${cfg.password}`);
    updated = updated.replace(/^DB_PASSWORD=.*$/gm, `DB_PASSWORD=${cfg.password}`);
  }

  // Replace Docker DATABASE_URL with standard local async & sync URLs
  updated = updated.replace(/^DATABASE_URL=.*$/gm, `DATABASE_URL=${conn.asyncSqlAlchemy}`);
  if (!updated.includes('DATABASE_SYNC_URL=')) {
    updated = updated.replace(
      `DATABASE_URL=${conn.asyncSqlAlchemy}`,
      `DATABASE_URL=${conn.asyncSqlAlchemy}\nDATABASE_SYNC_URL=${conn.syncSqlAlchemy}`
    );
  } else {
    updated = updated.replace(/^DATABASE_SYNC_URL=.*$/gm, `DATABASE_SYNC_URL=${conn.syncSqlAlchemy}`);
  }

  // Replace Docker Redis host
  updated = updated.replace(/^REDIS_HOST=.*$/gm, `REDIS_HOST=127.0.0.1`);
  updated = updated.replace(/^REDIS_URL=.*$/gm, `REDIS_URL=redis://127.0.0.1:6379/0`);

  // Replace Docker MinIO / S3 with native local file storage
  if (updated.includes('S3_ENDPOINT_URL=http://minio:9000')) {
    updated = updated.replace(/^S3_ENDPOINT_URL=.*$/gm, `# Native Local Uploads (Replaces Docker MinIO)\nSTORAGE_TYPE=local\nUPLOAD_DIR=/home/${cfg.hestiaUser}/web/YOUR_DOMAIN/uploads`);
  }

  return updated;
}

/**
 * Generate complete PostgreSQL DDL schema for HestiaCP native database
 */
export function generateHestiaPostgresSchema(config: Partial<HestiaDbConfig> = {}): string {
  const { fullDbName, fullDbUser } = generateHestiaDbConnectionStrings(config);

  return `-- ==============================================================================
-- DV-Help Bureau Suite — PostgreSQL Database Schema for HestiaCP
-- Database: ${fullDbName} | Owner: ${fullDbUser}
-- Direct Local Instance on 127.0.0.1:5432
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Applicants Primary Table
CREATE TABLE IF NOT EXISTS applicants (
    id VARCHAR(64) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    program_year INTEGER NOT NULL DEFAULT 2026,

    -- Name & Passport
    last_name VARCHAR(128) NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    middle_name VARCHAR(128) DEFAULT '',
    has_no_middle_name BOOLEAN DEFAULT FALSE,
    passport_number VARCHAR(64),

    -- Demographics
    gender VARCHAR(16) NOT NULL,
    birth_date DATE,
    birth_city VARCHAR(128),
    birth_city_unknown BOOLEAN DEFAULT FALSE,
    birth_country VARCHAR(128) NOT NULL,

    -- Eligibility
    is_eligible_based_on_birth_country BOOLEAN DEFAULT TRUE,
    alternate_country_of_eligibility VARCHAR(128) DEFAULT '',

    -- Photograph Metadata
    photo_data JSONB,

    -- Address
    in_care_of VARCHAR(128) DEFAULT '',
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255) DEFAULT '',
    city_town VARCHAR(128),
    district_county_province_state VARCHAR(128),
    postal_code VARCHAR(32) DEFAULT '',
    no_postal_code BOOLEAN DEFAULT FALSE,
    country VARCHAR(128),

    -- Contact & Living
    current_country VARCHAR(128),
    phone_number VARCHAR(64) DEFAULT '',
    email VARCHAR(255),
    email_confirmation VARCHAR(255),

    -- Qualifications & Marital Status
    highest_education VARCHAR(64),
    qualifying_work_experience BOOLEAN DEFAULT FALSE,
    occupation_title VARCHAR(128) DEFAULT '',
    job_zone_years INTEGER DEFAULT 0,
    marital_status VARCHAR(32) NOT NULL DEFAULT 'UNMARRIED',
    number_of_children INTEGER DEFAULT 0,

    -- MRZ Passport Strip Data (JSONB)
    mrz_data JSONB,

    -- Legal & Audit
    legal_acknowledged BOOLEAN DEFAULT FALSE,
    ethics_acknowledged BOOLEAN DEFAULT FALSE,
    official_submission_date TIMESTAMP WITH TIME ZONE,
    confirmation_number VARCHAR(64),
    submission_notes TEXT,
    
    -- Sync tracking
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Family Members Table (Spouses & Children)
CREATE TABLE IF NOT EXISTS family_members (
    id VARCHAR(64) PRIMARY KEY,
    applicant_id VARCHAR(64) NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    relationship VARCHAR(16) NOT NULL, -- 'SPOUSE' or 'CHILD'
    last_name VARCHAR(128) NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    middle_name VARCHAR(128) DEFAULT '',
    has_no_middle_name BOOLEAN DEFAULT FALSE,
    gender VARCHAR(16) NOT NULL,
    birth_date DATE,
    birth_city VARCHAR(128),
    birth_city_unknown BOOLEAN DEFAULT FALSE,
    birth_country VARCHAR(128),
    passport_number VARCHAR(64),
    photo_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bureau Activity & Audit Logs
CREATE TABLE IF NOT EXISTS bureau_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    applicant_id VARCHAR(64) REFERENCES applicants(id) ON DELETE SET NULL,
    action_type VARCHAR(64) NOT NULL,
    performed_by VARCHAR(128) NOT NULL DEFAULT 'system',
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants(status);
CREATE INDEX IF NOT EXISTS idx_applicants_program_year ON applicants(program_year);
CREATE INDEX IF NOT EXISTS idx_applicants_email ON applicants(email);
CREATE INDEX IF NOT EXISTS idx_applicants_passport ON applicants(passport_number);
CREATE INDEX IF NOT EXISTS idx_family_applicant_id ON family_members(applicant_id);
CREATE INDEX IF NOT EXISTS idx_audit_applicant_id ON bureau_audit_logs(applicant_id);

-- 6. Trigger for Automatic updated_at Timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_applicants_updated_at ON applicants;
CREATE TRIGGER trigger_applicants_updated_at
    BEFORE UPDATE ON applicants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Grant Privileges to HestiaCP User
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${fullDbUser}";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${fullDbUser}";
`;
}

/**
 * Convert Applicant objects to SQL INSERT statements for direct import into Hestia PostgreSQL
 */
export function exportApplicantsToSqlInserts(
  applicants: Applicant[],
  config: Partial<HestiaDbConfig> = {}
): string {
  const { fullDbName } = generateHestiaDbConnectionStrings(config);

  const escapeSql = (str?: string | null): string => {
    if (str === undefined || str === null) return 'NULL';
    return "'" + String(str).replace(/'/g, "''") + "'";
  };

  const escapeJson = (obj?: any): string => {
    if (!obj) return 'NULL';
    return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
  };

  let sql = `-- ==============================================================================\n`;
  sql += `-- DV-Help Bureau Data Export for HestiaCP PostgreSQL (${fullDbName})\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- Total Applicants: ${applicants.length}\n`;
  sql += `-- ==============================================================================\n\n`;
  sql += `BEGIN;\n\n`;

  for (const app of applicants) {
    const birthDateVal = app.birthDate ? escapeSql(app.birthDate) : 'NULL';
    const subDateVal = app.officialSubmissionDate ? escapeSql(app.officialSubmissionDate) : 'NULL';

    sql += `-- Entrant: ${app.firstName} ${app.lastName} (${app.id})\n`;
    sql += `INSERT INTO applicants (\n`;
    sql += `  id, created_at, updated_at, status, program_year,\n`;
    sql += `  last_name, first_name, middle_name, has_no_middle_name, passport_number,\n`;
    sql += `  gender, birth_date, birth_city, birth_city_unknown, birth_country,\n`;
    sql += `  is_eligible_based_on_birth_country, alternate_country_of_eligibility,\n`;
    sql += `  photo_data, in_care_of, address_line_1, address_line_2, city_town,\n`;
    sql += `  district_county_province_state, postal_code, no_postal_code, country,\n`;
    sql += `  current_country, phone_number, email, email_confirmation,\n`;
    sql += `  highest_education, qualifying_work_experience, occupation_title, job_zone_years,\n`;
    sql += `  marital_status, number_of_children, mrz_data,\n`;
    sql += `  legal_acknowledged, ethics_acknowledged, official_submission_date, confirmation_number, submission_notes\n`;
    sql += `) VALUES (\n`;
    sql += `  ${escapeSql(app.id)}, ${escapeSql(app.createdAt)}, ${escapeSql(app.updatedAt)}, ${escapeSql(app.status)}, ${app.programYear || 2026},\n`;
    sql += `  ${escapeSql(app.lastName)}, ${escapeSql(app.firstName)}, ${escapeSql(app.middleName)}, ${Boolean(app.hasNoMiddleName)}, ${escapeSql(app.passportNumber)},\n`;
    sql += `  ${escapeSql(app.gender)}, ${birthDateVal}, ${escapeSql(app.birthCity)}, ${Boolean(app.birthCityUnknown)}, ${escapeSql(app.birthCountry)},\n`;
    sql += `  ${Boolean(app.isEligibleBasedOnBirthCountry)}, ${escapeSql(app.alternateCountryOfEligibility)},\n`;
    sql += `  ${escapeJson(app.photo)}, ${escapeSql(app.inCareOf)}, ${escapeSql(app.addressLine1)}, ${escapeSql(app.addressLine2)}, ${escapeSql(app.cityTown)},\n`;
    sql += `  ${escapeSql(app.districtCountyProvinceState)}, ${escapeSql(app.postalCode)}, ${Boolean(app.noPostalCode)}, ${escapeSql(app.country)},\n`;
    sql += `  ${escapeSql(app.currentCountry)}, ${escapeSql(app.phoneNumber)}, ${escapeSql(app.email)}, ${escapeSql(app.emailConfirmation)},\n`;
    sql += `  ${escapeSql(app.highestEducation)}, ${Boolean(app.qualifyingWorkExperience)}, ${escapeSql(app.occupationTitle)}, ${Number(app.jobZoneYears) || 0},\n`;
    sql += `  ${escapeSql(app.maritalStatus)}, ${Number(app.numberOfChildren) || 0}, ${escapeJson(app.mrzData)},\n`;
    sql += `  ${Boolean(app.legalAcknowledged)}, ${Boolean(app.ethicsAcknowledged)}, ${subDateVal}, ${escapeSql(app.confirmationNumber)}, ${escapeSql(app.submissionNotes)}\n`;
    sql += `) ON CONFLICT (id) DO UPDATE SET\n`;
    sql += `  updated_at = EXCLUDED.updated_at,\n`;
    sql += `  status = EXCLUDED.status,\n`;
    sql += `  last_name = EXCLUDED.last_name,\n`;
    sql += `  first_name = EXCLUDED.first_name,\n`;
    sql += `  email = EXCLUDED.email,\n`;
    sql += `  mrz_data = EXCLUDED.mrz_data,\n`;
    sql += `  confirmation_number = EXCLUDED.confirmation_number;\n\n`;

    if (app.familyMembers && app.familyMembers.length > 0) {
      for (const fam of app.familyMembers) {
        const famBirth = fam.birthDate ? escapeSql(fam.birthDate) : 'NULL';
        sql += `INSERT INTO family_members (\n`;
        sql += `  id, applicant_id, relationship, last_name, first_name, middle_name, has_no_middle_name,\n`;
        sql += `  gender, birth_date, birth_city, birth_city_unknown, birth_country, passport_number, photo_data\n`;
        sql += `) VALUES (\n`;
        sql += `  ${escapeSql(fam.id)}, ${escapeSql(app.id)}, ${escapeSql(fam.relationship)}, ${escapeSql(fam.lastName)}, ${escapeSql(fam.firstName)}, ${escapeSql(fam.middleName)}, ${Boolean(fam.hasNoMiddleName)},\n`;
        sql += `  ${escapeSql(fam.gender)}, ${famBirth}, ${escapeSql(fam.birthCity)}, ${Boolean(fam.birthCityUnknown)}, ${escapeSql(fam.birthCountry)}, ${escapeSql(fam.passportNumber)}, ${escapeJson(fam.photo)}\n`;
        sql += `) ON CONFLICT (id) DO UPDATE SET\n`;
        sql += `  last_name = EXCLUDED.last_name,\n`;
        sql += `  first_name = EXCLUDED.first_name,\n`;
        sql += `  birth_date = EXCLUDED.birth_date;\n\n`;
      }
    }
  }

  sql += `COMMIT;\n`;
  return sql;
}

/**
 * Check connectivity and validate local PostgreSQL parameters
 */
export function validateHestiaDbConfig(config: Partial<HestiaDbConfig>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.hestiaUser?.trim()) {
    errors.push('HestiaCP Username is required (e.g. admin)');
  }
  if (!config.dbNameShort?.trim()) {
    errors.push('Short Database Name is required (e.g. dvhelp)');
  }
  if (!config.dbUserShort?.trim()) {
    errors.push('Short Database User is required (e.g. dvhelp)');
  }
  if (config.host && config.host !== '127.0.0.1' && config.host !== 'localhost' && !config.host.startsWith('/')) {
    errors.push(`Host '${config.host}' should be '127.0.0.1' or 'localhost' for native HestiaCP setup.`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
