// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library P256 {
    address constant P256VERIFY = address(uint160(0x0100));

    function verify(bytes32 hash, bytes memory signature, bytes memory pubkey) internal view returns (bool ok) {
        (bool success, bytes memory ret) = P256VERIFY.staticcall(abi.encode(hash, signature, pubkey));
        if (!success || ret.length < 32) return false;
        uint256 result;
        assembly { result := mload(add(ret, 0x20)) }
        return result == 1;
    }
}