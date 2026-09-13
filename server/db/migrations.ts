import { getDatabase } from './database';

export async function runMigrations(): Promise<void> {
  const db = getDatabase();

  // Create migrations table if not exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = await db.execute('SELECT version FROM schema_migrations ORDER BY version ASC');
  const appliedVersions = new Set(appliedRows.rows.map((r) => Number(r.version)));

  const migrations: Array<{ version: number; name: string; sql: string[] }> = [
    {
      version: 1,
      name: 'create_initial_tables',
      sql: [
        // Accounts table
        `CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          nickname TEXT,
          role TEXT NOT NULL CHECK(role IN ('user', 'controller')),
          email_or_phone TEXT,
          phone TEXT,
          email TEXT,
          age TEXT,
          avatar_url TEXT,
          badge_title TEXT,
          password_hash TEXT,
          created_at TEXT NOT NULL
        );`,

        // Settings table
        `CREATE TABLE IF NOT EXISTS settings (
          id TEXT PRIMARY KEY,
          system_title TEXT NOT NULL,
          allow_retake INTEGER NOT NULL DEFAULT 1,
          show_correct_immediately INTEGER NOT NULL DEFAULT 1,
          require_name INTEGER NOT NULL DEFAULT 1,
          is_matam_mode INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );`,

        // Content Items table
        `CREATE TABLE IF NOT EXISTS content_items (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT NOT NULL,
          options_json TEXT,
          correct_option_index INTEGER,
          points INTEGER DEFAULT 0,
          explanation TEXT,
          estimated_read_minutes INTEGER,
          sub_questions_json TEXT,
          poll_votes_json TEXT,
          is_published INTEGER NOT NULL DEFAULT 1,
          display_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );`,

        // Submissions table
        `CREATE TABLE IF NOT EXISTS submissions (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          user_name TEXT NOT NULL,
          user_contact TEXT,
          answers_json TEXT NOT NULL,
          total_score REAL NOT NULL DEFAULT 0,
          max_score REAL NOT NULL DEFAULT 0,
          feedback TEXT,
          controller_note_author TEXT,
          controller_note_date TEXT,
          submitted_at TEXT NOT NULL
        );`,

        // Mazar Programs table
        `CREATE TABLE IF NOT EXISTS mazar_programs (
          id TEXT PRIMARY KEY,
          day TEXT NOT NULL,
          title TEXT NOT NULL,
          time TEXT,
          description TEXT,
          speaker_or_maddah TEXT,
          location TEXT,
          created_at TEXT NOT NULL
        );`,

        // Banner Slides table
        `CREATE TABLE IF NOT EXISTS banner_slides (
          id TEXT PRIMARY KEY,
          image_url TEXT NOT NULL,
          title TEXT,
          subtitle TEXT,
          link_url TEXT,
          display_order INTEGER NOT NULL DEFAULT 0,
          is_published INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL
        );`,

        // Prayers table
        `CREATE TABLE IF NOT EXISTS prayers (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          subtitle TEXT,
          arabic_text TEXT NOT NULL,
          persian_translation TEXT,
          audio_url TEXT,
          reciter TEXT,
          duration TEXT,
          category TEXT,
          display_order INTEGER NOT NULL DEFAULT 0,
          is_published INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL
        );`,

        // Infallibles table
        `CREATE TABLE IF NOT EXISTS infallibles (
          id TEXT PRIMARY KEY,
          display_order INTEGER NOT NULL,
          name TEXT NOT NULL,
          title TEXT NOT NULL,
          epithet TEXT NOT NULL,
          kunya TEXT NOT NULL,
          father_name TEXT,
          mother_name TEXT,
          birth_date TEXT,
          birth_place TEXT,
          martyrdom_date TEXT,
          martyrdom_place TEXT,
          imamat_period TEXT,
          biography TEXT NOT NULL,
          virtues TEXT,
          hadith_json TEXT NOT NULL,
          special_ziyarah TEXT
        );`,

        // Indexes for fast lookup
        `CREATE INDEX IF NOT EXISTS idx_content_published ON content_items(is_published, display_order);`,
        `CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_infallibles_order ON infallibles(display_order);`,
      ],
    },
    {
      version: 2,
      name: 'add_library_books_and_password',
      sql: [
        `CREATE TABLE IF NOT EXISTS library_books (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          author TEXT,
          description TEXT,
          cover_url TEXT,
          content_text TEXT,
          pdf_url TEXT,
          pdf_file_name TEXT,
          category TEXT,
          is_published INTEGER NOT NULL DEFAULT 1,
          display_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );`,
      ],
    },
    {
      version: 3,
      name: 'add_nava_madahi',
      sql: [
        `CREATE TABLE IF NOT EXISTS nava_madahi (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          maddah TEXT,
          category TEXT,
          audio_url TEXT NOT NULL,
          cover_url TEXT,
          duration TEXT,
          description TEXT,
          is_published INTEGER NOT NULL DEFAULT 1,
          display_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );`,
      ],
    },
    {
      version: 4,
      name: 'create_sessions_table',
      sql: [
        `CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          refresh_token_hash TEXT NOT NULL,
          device_label TEXT,
          ip_address TEXT,
          created_at TEXT NOT NULL,
          last_used_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          revoked_at TEXT,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );`,
        `CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);`,
        `CREATE INDEX IF NOT EXISTS idx_sessions_refresh ON sessions(refresh_token_hash);`,
      ],
    },
  ];

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`[Migration] Applying migration ${migration.version}: ${migration.name}`);
      for (const sql of migration.sql) {
        await db.execute(sql);
      }
      await db.execute({
        sql: 'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
        args: [migration.version, migration.name, new Date().toISOString()],
      });
      console.log(`[Migration] Applied migration ${migration.version} successfully`);
    }
  }
}
