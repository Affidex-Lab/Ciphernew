export type Chain = 'EVM' | 'NEAR';

export type ActivityItem = {
  time: number;
  chain: Chain;
  kind: 'deploy' | 'send' | 'approve' | 'sign' | 'other';
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  uoHash?: string;
  origin?: string;
  meta?: any;
};

export type RecoveryFile = {
  version: 1;
  kdf: { algo: 'PBKDF2'; salt: string; iterations: number };
  cipher: { algo: 'AES-GCM'; iv: string };
  payload: {
    evm: { ownerPrivKey: string };
    near: { secretKey: string };
  };
};

export type Settings = {
  passphraseEnabled: boolean;
  analyticsEnabled?: boolean;
};

export type Config = {
  bundlerUrl: string;
  entryPoint: string;
  accountFactory: string;
  policyId?: string;
  rpcUrl: string;
  chainIdHex?: string;
  nearNetwork: string;
  nearNodeUrl: string;
  nearWalletUrl?: string;
  nearHelperUrl?: string;
  nearDefaultTokens?: string[];
  nearDefaultNfts?: string[];
};
