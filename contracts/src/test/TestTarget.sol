// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TestTarget {
    event Ping(address from);
    function ping() external {
        emit Ping(msg.sender);
    }
}