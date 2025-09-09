// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {IEntryPoint, UserOperation} from "../interfaces/IEntryPoint.sol";
import {P256} from "../lib/P256.sol";

contract CipherP256Account is IERC1271 {
    address public immutable entryPoint;
    bytes public ownerPublicKey;
    bool public frozen;

    event OwnerKeySet();
    event Frozen(bool v);

    modifier onlyEntryPoint() { require(msg.sender == entryPoint, "not ep"); _; }
    modifier onlySelf() { require(msg.sender == address(this), "not self"); _; }

    constructor(address _entryPoint, bytes memory _ownerPublicKey) {
        entryPoint = _entryPoint;
        ownerPublicKey = _ownerPublicKey;
        emit OwnerKeySet();
    }

    function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256) external view onlyEntryPoint returns (uint256) {
        if (frozen) return 1;
        if (P256.verify(userOpHash, userOp.signature, ownerPublicKey)) return 0;
        return 1;
    }

    function execute(address to, uint256 value, bytes calldata data) external onlyEntryPoint {
        require(!frozen, "frozen");
        (bool ok, bytes memory res) = to.call{value: value}(data);
        if (!ok) {
            assembly { revert(add(res, 0x20), mload(res)) }
        }
    }

    function setFrozen(bool v) external { require(msg.sender == address(this), "guard"); frozen = v; emit Frozen(v); }

    receive() external payable {}

    function isValidSignature(bytes32 hash, bytes memory signature) external view override returns (bytes4) {
        if (P256.verify(hash, signature, ownerPublicKey)) return 0x1626ba7e;
        return 0xffffffff;
    }
}