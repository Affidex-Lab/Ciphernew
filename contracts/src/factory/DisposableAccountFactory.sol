// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DisposableAccount} from "../accounts/DisposableAccount.sol";

contract DisposableAccountFactory {
    event Deployed(address account, address owner);

    function create(address entryPoint, address owner, bytes32 salt) external returns (address account) {
        account = address(new DisposableAccount{salt: salt}(entryPoint, owner));
        emit Deployed(account, owner);
    }

    function getAddress(address entryPoint, address owner, bytes32 salt) external view returns (address predicted) {
        bytes memory bytecode = abi.encodePacked(type(DisposableAccount).creationCode, abi.encode(entryPoint, owner));
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(bytecode)));
        predicted = address(uint160(uint256(hash)));
    }
}