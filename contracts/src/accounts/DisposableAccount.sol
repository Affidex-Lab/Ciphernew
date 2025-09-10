// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IEntryPoint, UserOperation} from "../interfaces/IEntryPoint.sol";

contract DisposableAccount {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public immutable entryPoint;
    address public immutable owner;
    bool public burned;

    modifier onlyEntryPoint() {
        require(msg.sender == entryPoint, "not ep");
        _;
    }

    constructor(address _entryPoint, address _owner) {
        entryPoint = _entryPoint;
        owner = _owner;
    }

    function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256) external view onlyEntryPoint returns (uint256) {
        if (burned) return 1;
        if (userOp.nonce != 0) return 1;
        address signer = userOpHash.toEthSignedMessageHash().recover(userOp.signature);
        if (signer != owner) return 1;
        return 0;
    }

    function executeAndBurn(address to, uint256 value, bytes calldata data) external onlyEntryPoint {
        require(!burned, "burned");
        (bool ok, bytes memory res) = to.call{value: value}(data);
        if (!ok) {
            assembly { revert(add(res, 0x20), mload(res)) }
        }
        burned = true;
    }

    receive() external payable {}
}