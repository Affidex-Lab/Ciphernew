CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL CHECK (type IN ('cipher','disposable','near')),
  chain_id int,
  owner_address text,
  account_address text UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','swept')),
  last_seen_at timestamptz
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id uuid REFERENCES wallets(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('disable','sweep','propose_recovery','execute_recovery')),
  destination_address text,
  tx_hash text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','confirmed','failed','skipped')),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_account_address ON wallets (account_address);
CREATE INDEX IF NOT EXISTS idx_wallets_created_at ON wallets (created_at);
CREATE INDEX IF NOT EXISTS idx_admin_actions_wallet_id ON admin_actions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions (created_at);
