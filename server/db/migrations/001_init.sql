-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL CHECK (type IN ('cipher','disposable','near')),
  chain_id int,
  owner_address text,
  account_address text UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','swept')),
  last_seen_at timestamptz
);

-- admin_actions table
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES wallets(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('disable','sweep','propose_recovery','execute_recovery')),
  destination_address text,
  tx_hash text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','confirmed','failed','skipped')),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- indexes
CREATE INDEX IF NOT EXISTS idx_wallets_account_address ON wallets(account_address);
CREATE INDEX IF NOT EXISTS idx_wallets_created_at ON wallets(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_actions_wallet_id ON admin_actions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);

-- trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_actions_updated_at ON admin_actions;
CREATE TRIGGER trg_admin_actions_updated_at BEFORE UPDATE ON admin_actions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
