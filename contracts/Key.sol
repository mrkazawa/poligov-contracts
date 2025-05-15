// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./IKey.sol";

/**
 * @title Key Management Contract
 * @dev Manages cryptographic keys associated with Ethereum addresses
 * Enables secure key addition and replacement with signature verification
 */
contract Key is IKey {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Mapping from user address to their associated key
    mapping(address => address) public keys;

    /// @inheritdoc IKey
    function addKey(address newKey) external override {
        // Validate key address
        if (newKey == address(0)) {
            revert InvalidKeyAddress();
        }

        // Check if a key already exists
        if (keys[msg.sender] != address(0)) {
            revert KeyAlreadyExists();
        }

        // Store the key
        keys[msg.sender] = newKey;

        // Emit event
        emit KeyAdded(msg.sender, newKey);
    }

    /// @inheritdoc IKey
    function replaceKey(
        address newKey,
        bytes memory signature
    ) external override {
        // Validate new key address
        if (newKey == address(0)) {
            revert InvalidKeyAddress();
        }

        // Get the old key
        address oldKey = keys[msg.sender];

        // Verify old key exists
        if (oldKey == address(0)) {
            revert NoKeyToReplace();
        }

        // Hash the combination of old and new keys for verification
        bytes32 messageHash = keccak256(abi.encodePacked(oldKey, newKey));

        // Verify the signature from the old key
        if (!verifySignature(messageHash, signature, oldKey)) {
            revert InvalidSignature();
        }

        // Update the key
        keys[msg.sender] = newKey;

        // Emit event
        emit KeyReplaced(msg.sender, oldKey, newKey);
    }

    /// @inheritdoc IKey
    function verifySignature(
        bytes32 messageHash,
        bytes memory signature,
        address signer
    ) public pure override returns (bool) {
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        return recoveredSigner == signer;
    }
}
