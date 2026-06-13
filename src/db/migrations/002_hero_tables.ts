export const sql = `
  CREATE TABLE IF NOT EXISTS heroes (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    base_hp INTEGER,
    hp_per_boon REAL,
    move_speed REAL,
    stamina INTEGER,
    sprint_speed REAL,
    win_rate REAL,
    pick_rate REAL,
    matches INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS hero_matchups (
    hero_id INTEGER NOT NULL,
    enemy_id INTEGER NOT NULL,
    win_rate REAL,
    matches INTEGER,
    PRIMARY KEY (hero_id, enemy_id)
  );

  CREATE TABLE IF NOT EXISTS hero_synergies (
    hero_id INTEGER NOT NULL,
    ally_id INTEGER NOT NULL,
    win_rate REAL,
    matches INTEGER,
    PRIMARY KEY (hero_id, ally_id)
  );
`;
