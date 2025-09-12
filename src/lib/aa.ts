import { ethers } from "ethers";

export type UserOperation = {
  sender: string;
  nonce: bigint;
  initCode: string;
  callData: string;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: string;
  signature: string;
};

const FACTORY_ABI = [
  "function create(address entryPoint, address owner, bytes32 salt) returns (address)",
  "function getAddress(address entryPoint, address owner, bytes32 salt) view returns (address)"
];

const ACCOUNT_ABI = [
  "function execute(address to, uint256 value, bytes data)",
  "function executeAndBurn(address to, uint256 value, bytes data)",
  "function configureGuardiansBySelf(address[] addrs, uint256 threshold, uint256 delaySeconds)",
  "function setFrozenBySelf(bool v)",
  "function executeRecovery(bytes32 id)",
  "function proposeRecoveryBySelf(address newOwner)",
  "function recoveryStart(bytes32) view returns (uint256)",
  "function recoveryConfirms(bytes32) view returns (uint256)",
  "function recoveryNewOwner(bytes32) view returns (address)"
];

const EP_ABI = [
  "function getUserOpHash((address,uint256,bytes,bytes,uint256,uint256,uint256,uint256,uint256,bytes,bytes)) view returns (bytes32)"
];

export async function sponsorUserOp(bundlerUrl: string, userOp: UserOperation, entryPoint: string, sponsorshipPolicyId: string) {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "pm_sponsorUserOperation",
    params: [ userOp, entryPoint, { sponsorshipPolicyId } ]
  };
  const res = await fetch(bundlerUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`pm_sponsorUserOperation failed: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "sponsor error");
  return json.result as { paymasterAndData: string };
}

export async function getGasPrice(bundlerUrl: string) {
  // Fallback to eth_gasPrice and use a small priority
  const res = await fetch(bundlerUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_gasPrice", params: [] }) });
  const json = await res.json();
  const gasPrice = BigInt(json.result);
  return { maxFeePerGas: gasPrice, maxPriorityFeePerGas: gasPrice / 10n };
}

export async function estimateUserOp(bundlerUrl: string, userOp: UserOperation, entryPoint: string) {
  const res = await fetch(bundlerUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_estimateUserOperationGas", params: [ userOp, entryPoint ] }) });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "estimate error");
  return json.result as { preVerificationGas: string, verificationGasLimit: string, callGasLimit: string };
}

export function packInitCode(factory: string, entryPoint: string, owner: string, salt: string) {
  const iface = new ethers.Interface(FACTORY_ABI);
  const data = iface.encodeFunctionData("create", [entryPoint, owner, salt]);
  return factory + data.slice(2);
}

export async function predictAccountAddress(rpc: string, factory: string, entryPoint: string, owner: string, salt: string) {
  const provider = new ethers.JsonRpcProvider(rpc);
  const iface = new ethers.Interface(FACTORY_ABI);
  const data = iface.encodeFunctionData("getAddress", [entryPoint, owner, salt]);
  const res = await provider.call({ to: factory, data });
  const [addr] = iface.decodeFunctionResult("getAddress", res);
  return addr as string;
}

export function encodeExecuteAndBurn(to: string, value: bigint, data: string) {
  const iface = new ethers.Interface(ACCOUNT_ABI);
  return iface.encodeFunctionData("executeAndBurn", [to, value, data]);
}

export function encodeSelf(account: string, data: string) {
  const iface = new ethers.Interface(ACCOUNT_ABI);
  return iface.encodeFunctionData("execute", [account, 0n, data]);
}

export function dataConfigureGuardiansBySelf(addrs: string[], threshold: number, delaySeconds: number) {
  const iface = new ethers.Interface(ACCOUNT_ABI);
  return iface.encodeFunctionData("configureGuardiansBySelf", [addrs, threshold, delaySeconds]);
}

export function dataSetFrozenBySelf(v: boolean) {
  const iface = new ethers.Interface(ACCOUNT_ABI);
  return iface.encodeFunctionData("setFrozenBySelf", [v]);
}

export function dataExecuteRecovery(id: string) {
  const iface = new ethers.Interface(ACCOUNT_ABI);
  return iface.encodeFunctionData("executeRecovery", [id]);
}

export function dataProposeRecoveryBySelf(newOwner: string) {
  const iface = new ethers.Interface(ACCOUNT_ABI);
  return iface.encodeFunctionData("proposeRecoveryBySelf", [newOwner]);
}

export function recoveryId(account: string, chainId: bigint, newOwner: string) {
  return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["address","uint256","address"],[account, chainId, newOwner]));
}

export async function readRecovery(providerUrl: string, account: string, id: string) {
  const provider = new ethers.JsonRpcProvider(providerUrl);
  const iface = new ethers.Interface(ACCOUNT_ABI);
  const rs = await provider.call({ to: account, data: iface.encodeFunctionData("recoveryStart", [id]) });
  const rc = await provider.call({ to: account, data: iface.encodeFunctionData("recoveryConfirms", [id]) });
  const rn = await provider.call({ to: account, data: iface.encodeFunctionData("recoveryNewOwner", [id]) });
  const [start] = iface.decodeFunctionResult("recoveryStart", rs) as [bigint];
  const [confirms] = iface.decodeFunctionResult("recoveryConfirms", rc) as [bigint];
  const [newOwner] = iface.decodeFunctionResult("recoveryNewOwner", rn) as [string];
  return { start, confirms, newOwner };
}

export async function getUserOpHash(rpc: string, entryPoint: string, userOp: UserOperation) {
  const provider = new ethers.JsonRpcProvider(rpc);
  const ep = new ethers.Interface(EP_ABI);
  const data = ep.encodeFunctionData("getUserOpHash", [userOp]);
  const ret = await provider.call({ to: entryPoint, data });
  const [hash] = ep.decodeFunctionResult("getUserOpHash", ret);
  return hash as string;
}

export async function sendUserOp(bundlerUrl: string, userOp: UserOperation, entryPoint: string) {
  const body = { jsonrpc: "2.0", id: 1, method: "eth_sendUserOperation", params: [ userOp, entryPoint ] };
  const res = await fetch(bundlerUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "send error");
  return json.result as string; // userOpHash
}

export async function getUserOpReceipt(bundlerUrl: string, userOpHash: string) {
  const body = { jsonrpc: "2.0", id: 1, method: "eth_getUserOperationReceipt", params: [ userOpHash ] };
  const res = await fetch(bundlerUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  if (json.error) return null;
  return json.result as { receipt?: { transactionHash: string } } | null;
}
