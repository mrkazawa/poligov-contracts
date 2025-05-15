// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IGovernment
 * @dev Interface for the Government contract
 */
interface IGovernment {
    // Custom errors
    error NotOwner();
    error ZeroAddressNotAllowed();

    /**
     * @dev Transfers ownership of the contract to a new account
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external;
}
