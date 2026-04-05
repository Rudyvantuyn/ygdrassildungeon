CREATE TABLE IF NOT EXISTS profiles (
  player_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  account_level INT NOT NULL DEFAULT 1,
  currency INT NOT NULL DEFAULT 0,
  inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
  unlocked_classes JSONB NOT NULL DEFAULT '["Guardian","Ranger"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dungeon_runs (
  run_id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  status TEXT NOT NULL,
  floor_index INT NOT NULL DEFAULT 0,
  rewards JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_wallet_ledger (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  amount INT NOT NULL,
  kind TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_inventory (
  item_instance_id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  item_definition_id TEXT NOT NULL,
  item_level INT NOT NULL DEFAULT 1,
  affixes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_unlocks (
  player_id TEXT NOT NULL,
  unlock_type TEXT NOT NULL,
  unlock_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, unlock_type, unlock_key)
);

CREATE TABLE IF NOT EXISTS player_stats_snapshot (
  player_id TEXT PRIMARY KEY,
  stamina INT NOT NULL DEFAULT 120,
  mastery_xp INT NOT NULL DEFAULT 0,
  skill_points INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  cadence TEXT NOT NULL,
  objective JSONB NOT NULL,
  rewards JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS player_missions (
  player_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, mission_id)
);

CREATE TABLE IF NOT EXISTS mission_reward_claims (
  player_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, mission_id)
);

CREATE TABLE IF NOT EXISTS skill_nodes (
  id TEXT PRIMARY KEY,
  class_name TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS player_skill_progress (
  player_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  unlocked_node_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipped_skill_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, class_name)
);

CREATE TABLE IF NOT EXISTS class_mastery (
  player_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  PRIMARY KEY (player_id, class_name)
);

CREATE TABLE IF NOT EXISTS shop_catalog (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  price INT NOT NULL,
  stock INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS shop_rotations (
  id TEXT PRIMARY KEY,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS shop_purchases (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  price INT NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS economy_audit (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  value INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS season_definitions (
  season_id TEXT PRIMARY KEY,
  season_name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS player_season_progress (
  player_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  PRIMARY KEY (player_id, season_id)
);

CREATE TABLE IF NOT EXISTS leaderboards (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  score INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
