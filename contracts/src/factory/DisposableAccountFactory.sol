// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DisposableAccount} from "../accounts/DisposableAccount.sol";

contract DisposableAccountFactory {
    event Deployed(address account, address owner);

    function create(address entryPoint, address owner) external returns (address account) {
        account = address(new DisposableAccount(entryPoint, owner));
        emit Deployed(account, owner);
    }
}