// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Interface for the Key contract with custom errors
 */
interface IKey {
    // Custom errors
    error InvalidKeyAddress();
    error KeyAlreadyExists();
    error NoKeyToReplace();
    error InvalidSignature();

    // Events
    event KeyAdded(address indexed account, address key);
    event KeyReplaced(address indexed account, address oldKey, address newKey);

    /**
     * @dev Add a new key for the sender
     * @param newKey The key to be added
     */
    function addKey(address newKey) external;

    /**
     * @dev Replace the existing key with a new one
     * @param newKey The new key to replace the old one
     * @param signature The signature of the combined old key and new key
     */
    function replaceKey(address newKey, bytes memory signature) external;

    /**
     * @dev Verify if a signature is valid for a given message and signer
     * @param messageHash The hash of the message that was signed
     * @param signature The signature to verify
     * @param signer The address of the signer
     * @return bool True if the signature is valid, false otherwise
     */
    function verifySignature(
        bytes32 messageHash,
        bytes memory signature,
        address signer
    ) external pure returns (bool);
}
