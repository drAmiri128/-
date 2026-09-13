import { createClient, type Client as LibSqlClient } from '@libsql/client';
import { Pool as PgPool } from 'pg';
import path from 'path';
import fs from 'fs';

export interface IDatabaseClient {
  execute(
    query: string | { sql: string; args?: any[] },
    params?: any[]
  ): Promise<{ rows: any[] }>;
  type: 'sqlite' | 'postgres';
  url: string;
}

let activeClient: IDatabaseClient | null = null;

const CONFIG_PATH = path.join(process.cwd(), 'data', 'db_config.json');

function loadPersistedConfig(): { databaseUrl?: string; authToken?: string } {
  // Never read persisted files in production
  if (process.env.NODE_ENV === 'production') {
    return {};
  }
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[DB Config] Failed to read persisted db config:', e);
  }
  return {};
}

function savePersistedConfig(config: { databaseUrl: string; authToken?: string }): void {
  // Never write credentials to filesystem in production
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  try {
    const dataDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('[DB Config] Failed to write db config:', e);
  }
}

export function maskDatabaseUrl(rawUrl: string): string {
  try {
    if (rawUrl.startsWith('file:')) return rawUrl;
    return rawUrl.replace(/:([^:@]+)@/, ':******@');
  } catch {
    return 'postgresql://******';
  }
}

export function parsePostgresUrl(rawUrl: string): {
  user?: string;
  password?: string;
  host?: string;
  port?: number;
  database?: string;
  cleanUrl: string;
} {
  let clean = rawUrl.trim();
  if (clean.includes('?url=')) {
    clean = decodeURIComponent(clean.split('?url=')[1]);
  }
  clean = clean.replace(/&amp;/g, '&');

  const match = clean.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/]+)(?::(\d+))?\/([^?]+)/);
  if (match) {
    let [, user, password, host, port, database] = match;
    user = decodeURIComponent(user);
    if (password.startsWith('[') && password.endsWith(']')) {
      password = password.slice(1, -1);
    }
    try {
      password = decodeURIComponent(password);
    } catch {
      // if not URI encoded or contains invalid %
    }

    // Auto-detect Supabase direct connection (db.<ref>.supabase.co) which is IPv6-only
    // and seamlessly adapt it to use Supabase IPv4 Pooler
    const supabaseDirectMatch = host.match(/^db\.([a-z0-9-]+)\.supabase\.co$/);
    if (supabaseDirectMatch) {
      const projectRef = supabaseDirectMatch[1];
      host = 'aws-0-eu-central-1.pooler.supabase.com';
      if (!user.includes('.')) {
        user = `postgres.${projectRef}`;
      }
      port = port || '5432';
    }

    const cleanUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port || 5432}/${database.split('?')[0]}`;
    return {
      user,
      password,
      host,
      port: port ? parseInt(port, 10) : 5432,
      database: database.split('?')[0],
      cleanUrl,
    };
  }

  return { cleanUrl: clean };
}

function createLibSqlAdapter(url: string, authToken?: string): IDatabaseClient {
  const client: LibSqlClient = createClient({
    url,
    authToken,
  });

  return {
    type: 'sqlite',
    url,
    async execute(query, params) {
      if (typeof query === 'string' && params !== undefined) {
        const res = await client.execute({ sql: query, args: params });
        return { rows: res.rows as any[] };
      }
      const res = await client.execute(query);
      return { rows: res.rows as any[] };
    },
  };
}

function createPostgresAdapter(url: string): IDatabaseClient {
  const parsed = parsePostgresUrl(url);
  const pool = new PgPool(
    parsed.user && parsed.host
      ? {
          user: parsed.user,
          password: parsed.password,
          host: parsed.host,
          port: parsed.port || 5432,
          database: parsed.database || 'postgres',
          ssl: { rejectUnauthorized: false },
        }
      : {
          connectionString: parsed.cleanUrl || url,
          ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
        }
  );

  let sqliteFallback: IDatabaseClient | null = null;

  return {
    type: 'postgres',
    url: parsed.cleanUrl || url,
    async execute(query, params) {
      if (sqliteFallback) {
        return await sqliteFallback.execute(query, params);
      }

      let sqlStr: string;
      let args: any[] = [];

      if (typeof query === 'string') {
        sqlStr = query;
        args = params || [];
      } else {
        sqlStr = query.sql;
        args = query.args || [];
      }

      // Convert SQLite ? to Postgres $1, $2...
      let paramIdx = 1;
      const pgSql = sqlStr.replace(/\?/g, () => `$${paramIdx++}`);

      try {
        const res = await pool.query(pgSql, args);
        return { rows: res.rows };
      } catch (err: any) {
        if (
          process.env.NODE_ENV !== 'production' &&
          (err.message?.includes('password authentication failed') ||
            err.message?.includes('ECONNREFUSED') ||
            err.message?.includes('ENOTFOUND'))
        ) {
          console.warn('[Database Fallback] PostgreSQL error, falling back to local SQLite engine:', err.message);
          const dataDir = path.join(process.cwd(), 'data');
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
          sqliteFallback = createLibSqlAdapter(`file:${path.join(dataDir, 'sqm_database.db')}`);
          // Ensure migrations and seed are run on fallback engine
          try {
            const { runMigrations } = await import('./migrations');
            const { seedInitialData } = await import('./seed');
            await runMigrations();
            await seedInitialData();
          } catch (migErr) {
            console.warn('[DB Fallback Migration]', migErr);
          }
          return await sqliteFallback.execute(query, params);
        }
        throw err;
      }
    },
  };
}

export function getDatabase(): IDatabaseClient {
  if (activeClient) {
    return activeClient;
  }

  // 1. Primary Source: Strictly from environment variables
  let dbUrl = process.env.DATABASE_URL?.trim();
  let authToken = process.env.DATABASE_AUTH_TOKEN?.trim() || process.env.TURSO_AUTH_TOKEN?.trim();

  // If dbUrl is not provided, check if authToken contains a full PostgreSQL connection URL
  if (
    !dbUrl &&
    authToken &&
    (authToken.includes('postgresql://') ||
      authToken.includes('postgres://') ||
      authToken.includes('supabase'))
  ) {
    dbUrl = authToken;
    authToken = undefined;
  }

  // In production, DATABASE_URL must strictly come from environment variables
  if (process.env.NODE_ENV === 'production' && !dbUrl) {
    throw new Error('FATAL SECURITY ERROR: DATABASE_URL environment variable is required in production.');
  }

  // In local development fallback only if env is not set
  if (!dbUrl && process.env.NODE_ENV !== 'production') {
    const persisted = loadPersistedConfig();
    if (persisted.databaseUrl) {
      dbUrl = persisted.databaseUrl.trim();
      authToken = persisted.authToken?.trim() || authToken;
    }
  }

  // If still empty in development, fall back to safe local SQLite
  if (!dbUrl) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    dbUrl = `file:${path.join(dataDir, 'sqm_database.db')}`;
  }

  let cleanUrl = dbUrl;
  if (cleanUrl.includes('?url=')) {
    cleanUrl = decodeURIComponent(cleanUrl.split('?url=')[1]);
  }
  cleanUrl = cleanUrl.replace(/&amp;/g, '&');

  if (
    cleanUrl.startsWith('postgresql:') ||
    cleanUrl.startsWith('postgres:') ||
    cleanUrl.includes('pooler.supabase.com') ||
    cleanUrl.includes('supabase.co')
  ) {
    activeClient = createPostgresAdapter(cleanUrl);
  } else {
    activeClient = createLibSqlAdapter(cleanUrl, authToken);
  }

  return activeClient;
}

export function getCurrentDatabaseInfo(): {
  url: string;
  maskedUrl: string;
  type: string;
} {
  const db = getDatabase();
  return {
    url: db.url,
    maskedUrl: maskDatabaseUrl(db.url),
    type: db.type,
  };
}

export async function updateAndTestDatabaseUrl(
  newUrl: string,
  newAuthToken?: string
): Promise<{ success: boolean; message: string; type: string }> {
  let trimmed = newUrl.trim();
  if (!trimmed) {
    throw new Error('آدرس دیتابیس نمی‌تواند خالی باشد.');
  }

  if (trimmed.includes('?url=')) {
    trimmed = decodeURIComponent(trimmed.split('?url=')[1]);
  }
  trimmed = trimmed.replace(/&amp;/g, '&');

  let testClient: IDatabaseClient;
  if (
    trimmed.startsWith('postgresql:') ||
    trimmed.startsWith('postgres:') ||
    trimmed.includes('pooler.supabase.com') ||
    trimmed.includes('supabase.co')
  ) {
    testClient = createPostgresAdapter(trimmed);
  } else {
    testClient = createLibSqlAdapter(trimmed, newAuthToken?.trim() || undefined);
  }

  // Test query
  await testClient.execute('SELECT 1 as connection_test');

  // Save config
  savePersistedConfig({
    databaseUrl: testClient.url,
    authToken: newAuthToken?.trim() || undefined,
  });

  // Switch active client
  activeClient = testClient;

  // Run migrations and seeds on the newly connected database
  try {
    const { runMigrations } = await import('./migrations');
    const { seedInitialData } = await import('./seed');
    await runMigrations();
    await seedInitialData();
  } catch (migErr) {
    console.warn('[DB Migration Warning] Could not auto-migrate:', migErr);
  }

  return {
    success: true,
    message: `اتصال به پایگاه داده (${testClient.type === 'postgres' ? 'PostgreSQL' : 'SQLite / LibSQL'}) با موفقیت برقرار و جداول آماده‌سازی شدند.`,
    type: testClient.type,
  };
}
