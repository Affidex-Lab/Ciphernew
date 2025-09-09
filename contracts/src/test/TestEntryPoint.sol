// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

struct UserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    uint256 callGasLimit;
    uint256 verificationGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    bytes paymasterAndData;
    bytes signature;
}

interface IValidate {
    function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 missingFunds) external returns (uint256);
}

interface IExec {
    function execute(address to, uint256 value, bytes calldata data) external;
}

interface IExecBurn {
    function executeAndBurn(address to, uint256 value, bytes calldata data) external;
}

contract TestEntryPoint {
    function callValidate(address account, UserOperation calldata op, bytes32 h) external returns (uint256) {
        return IValidate(account).validateUserOp(op, h, 0);
    }

    function callExecute(address account, address to, uint256 value, bytes calldata data) external {
        IExec(account).execute(to, value, data);
    }

    function callExecuteAndBurn(address account, address to, uint256 value, bytes calldata data) external {
        IExecBurn(account).executeAndBurn(to, value, data);
    }
}