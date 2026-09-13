import crypto from 'crypto';
import { getDatabase } from './database';

export interface SessionRecord {
  id: string;
  accountId: string;
  deviceLabel: string;
  ipAddress: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

const REFRESH_TOKEN_TTL_DAYS = 30;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  accountId: string,
  meta: { deviceLabel?: string; ipAddress?: string } = {}
): Promise<{ sessionId: string; refreshToken: string; expiresAt: string }> {
  const sessionId = `sess-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const rawRefreshToken = `rft-${crypto.randomBytes(32).toString('hex')}`;
  const refreshTokenHash = hashToken(rawRefreshToken);

  const now = new Date();
  const createdAt = now.toISOString();
  const lastUsedAt = createdAt;

  const expiresDate = new Date(now.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const expiresAt = expiresDate.toISOString();

  const db = getDatabase();
  await db.execute({
    sql: `INSERT INTO sessions (
      id, account_id, refresh_token_hash, device_label, ip_address, created_at, last_used_at, expires_at, revoked_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    args: [
      sessionId,
      accountId,
      refreshTokenHash,
      meta.deviceLabel || 'دستگاه مرورگر وب',
      meta.ipAddress || '127.0.0.1',
      createdAt,
      lastUsedAt,
      expiresAt,
    ],
  });

  return { sessionId, refreshToken: rawRefreshToken, expiresAt };
}

export async function verifyAndRotateSession(
  rawRefreshToken: string,
  meta: { deviceLabel?: string; ipAddress?: string } = {}
): Promise<{
  session: SessionRecord;
  account: { id: string; name: string; role: string; emailOrPhone: string };
  newRefreshToken: string;
} | null> {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') return null;

  const db = getDatabase();
  const tokenHash = hashToken(rawRefreshToken.trim());

  const result = await db.execute({
    sql: `SELECT s.*, a.name as account_name, a.role as account_role, a.email_or_phone as account_contact
          FROM sessions s
          JOIN accounts a ON s.account_id = a.id
          WHERE s.refresh_token_hash = ?`,
    args: [tokenHash],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const now = new Date();

  // Check if revoked or expired
  if (row.revoked_at) {
    return null;
  }

  const expiresDate = new Date(row.expires_at as string);
  if (expiresDate.getTime() <= now.getTime()) {
    return null;
  }

  // Issue new rotated refresh token
  const newRawRefreshToken = `rft-${crypto.randomBytes(32).toString('hex')}`;
  const newRefreshTokenHash = hashToken(newRawRefreshToken);
  const lastUsedAt = now.toISOString();

  await db.execute({
    sql: `UPDATE sessions SET
      refresh_token_hash = ?,
      last_used_at = ?,
      device_label = COALESCE(?, device_label),
      ip_address = COALESCE(?, ip_address)
    WHERE id = ?`,
    args: [
      newRefreshTokenHash,
      lastUsedAt,
      meta.deviceLabel || null,
      meta.ipAddress || null,
      row.id,
    ],
  });

  const session: SessionRecord = {
    id: row.id as string,
    accountId: row.account_id as string,
    deviceLabel: (row.device_label as string) || 'مرورگر وب',
    ipAddress: (row.ip_address as string) || '',
    createdAt: row.created_at as string,
    lastUsedAt,
    expiresAt: row.expires_at as string,
    revokedAt: null,
  };

  return {
    session,
    account: {
      id: row.account_id as string,
      name: row.account_name as string,
      role: row.account_role as string,
      emailOrPhone: (row.account_contact as string) || '',
    },
    newRefreshToken: newRawRefreshToken,
  };
}

export async function revokeSession(sessionId: string, accountId?: string): Promise<boolean> {
  const db = getDatabase();
  const now = new Date().toISOString();

  let sql = 'UPDATE sessions SET revoked_at = ? WHERE id = ?';
  const args: any[] = [now, sessionId];

  if (accountId) {
    sql += ' AND account_id = ?';
    args.push(accountId);
  }

  const result = await db.execute({ sql, args });
  return ((result as any).rowsAffected ?? 1) > 0;
}

export async function revokeSessionByToken(rawRefreshToken: string): Promise<boolean> {
  if (!rawRefreshToken) return false;
  const db = getDatabase();
  const tokenHash = hashToken(rawRefreshToken.trim());
  const now = new Date().toISOString();

  const result = await db.execute({
    sql: 'UPDATE sessions SET revoked_at = ? WHERE refresh_token_hash = ?',
    args: [now, tokenHash],
  });
  return ((result as any).rowsAffected ?? 1) > 0;
}

export async function revokeAllSessionsForAccount(accountId: string, exceptSessionId?: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  if (exceptSessionId) {
    await db.execute({
      sql: 'UPDATE sessions SET revoked_at = ? WHERE account_id = ? AND id != ? AND revoked_at IS NULL',
      args: [now, accountId, exceptSessionId],
    });
  } else {
    await db.execute({
      sql: 'UPDATE sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL',
      args: [now, accountId],
    });
  }
}

export async function getActiveSessionsForAccount(accountId: string): Promise<SessionRecord[]> {
  const db = getDatabase();
  const now = new Date().toISOString();

  const result = await db.execute({
    sql: `SELECT id, account_id, device_label, ip_address, created_at, last_used_at, expires_at, revoked_at
          FROM sessions
          WHERE account_id = ? AND revoked_at IS NULL AND expires_at > ?
          ORDER BY last_used_at DESC`,
    args: [accountId, now],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    accountId: row.account_id as string,
    deviceLabel: (row.device_label as string) || 'مرورگر وب',
    ipAddress: (row.ip_address as string) || '',
    createdAt: row.created_at as string,
    lastUsedAt: row.last_used_at as string,
    expiresAt: row.expires_at as string,
    revokedAt: null,
  }));
}
