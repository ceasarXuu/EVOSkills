import type { Database } from 'sql.js';

export function createSQLiteStorageTables(db: Database): void {
  db.run(`
      -- Shadow Skills 表
      CREATE TABLE IF NOT EXISTS shadow_skills (
        shadow_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        skill_id TEXT NOT NULL,
        runtime TEXT DEFAULT 'codex',
        origin_skill_id TEXT NOT NULL,
        origin_version_at_fork TEXT NOT NULL,
        shadow_path TEXT NOT NULL,
        current_revision INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL,
        last_optimized_at TEXT,
        hit_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        manual_override_count INTEGER DEFAULT 0,
        health_score REAL DEFAULT 100.0,
        UNIQUE(project_id, skill_id)
      );
    `);

  db.run(`
      CREATE TABLE IF NOT EXISTS evolution_records_index (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shadow_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        change_type TEXT NOT NULL,
        source_sessions TEXT,
        confidence REAL,
        FOREIGN KEY (shadow_id) REFERENCES shadow_skills(shadow_id)
      );
    `);

  db.run(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shadow_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        file_path TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        FOREIGN KEY (shadow_id) REFERENCES shadow_skills(shadow_id)
      );
    `);

  db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        runtime TEXT NOT NULL,
        project_id TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        trace_count INTEGER DEFAULT 0
      );
    `);

  db.run(`
      CREATE TABLE IF NOT EXISTS traces_index (
        trace_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        runtime TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        status TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
      );
    `);

  db.run(`
      -- Trace-Skill 映射表
      CREATE TABLE IF NOT EXISTS trace_skill_mappings (
        trace_id TEXT NOT NULL,
        skill_id TEXT NOT NULL,
        shadow_id TEXT,
        confidence REAL NOT NULL,
        reason TEXT,
        mapped_at TEXT NOT NULL,
        PRIMARY KEY (trace_id, skill_id)
      );
    `);

  db.run(`
      -- Origin Skills 表
      CREATE TABLE IF NOT EXISTS origin_skills (
        skill_id TEXT PRIMARY KEY,
        origin_path TEXT NOT NULL,
        origin_version TEXT NOT NULL,
        source TEXT NOT NULL,
        installed_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );
    `);

  db.run('CREATE INDEX IF NOT EXISTS idx_shadow_project ON shadow_skills(project_id);');
  try {
    db.run("ALTER TABLE shadow_skills ADD COLUMN runtime TEXT DEFAULT 'codex';");
  } catch {
    // ignore when column already exists
  }
  db.run('CREATE INDEX IF NOT EXISTS idx_evolution_shadow ON evolution_records_index(shadow_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_traces_session ON traces_index(session_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_traces_timestamp ON traces_index(timestamp);');
  db.run('CREATE INDEX IF NOT EXISTS idx_trace_skill_skill ON trace_skill_mappings(skill_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_trace_skill_shadow ON trace_skill_mappings(shadow_id);');
}
