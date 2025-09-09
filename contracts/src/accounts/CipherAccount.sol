// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {IEntryPoint, UserOperation} from "../interfaces/IEntryPoint.sol";

contract CipherAccount is IERC1271 {
    using ECDSA for bytes32;

    address public immutable entryPoint;
    address public owner;
    mapping(address => bool) public sessionKeys;
    bool public frozen;

    mapping(address => bool) public guardians;
    uint256 public guardianCount;
    uint256 public recoveryThreshold;
    uint256 public recoveryDelay;

    mapping(bytes32 => uint256) public recoveryStart;
    mapping(bytes32 => address) public recoveryNewOwner;
    mapping(bytes32 => uint256) public recoveryConfirms;
    mapping(bytes32 => mapping(address => bool)) public recoveryApproved;

    event OwnerChanged(address indexed owner);
    event Frozen(bool frozen);
    event GuardiansUpdated(uint256 count, uint256 threshold, uint256 delay);
    event RecoveryProposed(bytes32 id, address newOwner);
    event RecoveryConfirmed(bytes32 id, address guardian, uint256 count);
    event RecoveryExecuted(bytes32 id, address newOwner);

    modifier onlyEntryPoint() {
        require(msg.sender == entryPoint, "not ep");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address _entryPoint, address _owner) {
        entryPoint = _entryPoint;
        owner = _owner;
        emit OwnerChanged(_owner);
    }

    function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256) external view onlyEntryPoint returns (uint256) {
        if (frozen) return 1;
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address signer = hash.recover(userOp.signature);
        if (signer == owner || sessionKeys[signer]) return 0;
        return 1;
    }

    function execute(address to, uint256 value, bytes calldata data) external onlyEntryPoint {
        require(!frozen, "frozen");
        (bool ok, bytes memory res) = to.call{value: value}(data);
        if (!ok) {
            assembly { revert(add(res, 0x20), mload(res)) }
        }
    }

    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
        emit OwnerChanged(newOwner);
    }

    function setFrozen(bool v) external onlyOwner { frozen = v; emit Frozen(v); }

    function guardianFreeze() external {
        require(guardians[msg.sender], "not guardian");
        frozen = true;
        emit Frozen(true);
    }

    function setSessionKey(address k, bool v) external onlyOwner { sessionKeys[k] = v; }

    function configureGuardians(address[] calldata addrs, uint256 threshold, uint256 delaySeconds) external onlyOwner {
        for (uint256 i = 0; i < addrs.length; i++) {
            if (!guardians[addrs[i]]) {
                guardians[addrs[i]] = true;
                guardianCount += 1;
            }
        }
        require(threshold > 0 && threshold <= guardianCount, "bad threshold");
        recoveryThreshold = threshold;
        recoveryDelay = delaySeconds;
        emit GuardiansUpdated(guardianCount, threshold, delaySeconds);
    }

    function proposeRecovery(address newOwner) external returns (bytes32 id) {
        require(guardians[msg.sender] || msg.sender == owner, "not allowed");
        id = keccak256(abi.encodePacked(address(this), block.chainid, newOwner));
        if (recoveryStart[id] == 0) {
            recoveryStart[id] = block.timestamp;
            recoveryNewOwner[id] = newOwner;
            emit RecoveryProposed(id, newOwner);
        } else {
            require(recoveryNewOwner[id] == newOwner, "mismatch");
        }
        if (guardians[msg.sender] && !recoveryApproved[id][msg.sender]) {
            recoveryApproved[id][msg.sender] = true;
            uint256 c = recoveryConfirms[id] + 1;
            recoveryConfirms[id] = c;
            emit RecoveryConfirmed(id, msg.sender, c);
        }
    }

    function executeRecovery(bytes32 id) external {
        address newOwner = recoveryNewOwner[id];
        require(newOwner != address(0), "no rec");
        require(recoveryConfirms[id] >= recoveryThreshold, "low conf");
        require(block.timestamp >= recoveryStart[id] + recoveryDelay, "delay");
        owner = newOwner;
        emit OwnerChanged(newOwner);
        delete recoveryStart[id];
        delete recoveryNewOwner[id];
        delete recoveryConfirms[id];
    }

    receive() external payable {}

    function isValidSignature(bytes32 hash, bytes memory signature) external view override returns (bytes4) {
        address signer = hash.toEthSignedMessageHash().recover(signature);
        if (signer == owner || sessionKeys[signer]) return 0x1626ba7e;
        return 0xffffffff;
    }
}