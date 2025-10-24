export type NearNetwork = "mainnet" | "testnet" | string;

export type NearSession = {
  network: NearNetwork;
  accountId: string | null;
};

export type NearConfig = {
  network: NearNetwork;
  nodeUrl: string;
  walletUrl: string;
  helperUrl: string;
  explorerUrl: string;
};
