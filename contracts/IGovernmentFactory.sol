// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IGovernmentFactory
 * @dev Interface for the GovernmentFactory contract
 */
interface IGovernmentFactory {
    // Custom errors
    error NotAuthorized();
    error ZeroAddressNotAllowed();
    error GovernmentAlreadyExists();

    // Events
    event GovernmentCreated(address indexed government, address indexed owner);

    /**
     * @dev Create a new government with the specified owner
     * @param governmentOwner The address that will own the government
     * @return government The address of the newly created government
     */
    function createGovernment(
        address governmentOwner
    ) external returns (address);

    /**
     * @dev Check if an address is a government created by this factory
     * @param government The address to check
     * @return bool True if the address is a government, false otherwise
     */
    function isGovernment(address government) external view returns (bool);
}
