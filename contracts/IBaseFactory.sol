// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IBaseFactory
 * @dev Interface for the BaseFactory contract
 */
interface IBaseFactory {
    // Custom errors
    error NotOwner();
    error FactoryAlreadyRegistered();
    error FactoryNotRegistered();
    error ZeroAddressNotAllowed();

    // Events
    event FactoryRegistered(address indexed factory);
    event FactoryUnregistered(address indexed factory);

    /**
     * @dev Register a new factory address
     * @param factory The address of the factory to register
     */
    function registerFactory(address factory) external;

    /**
     * @dev Unregister an existing factory address
     * @param factory The address of the factory to unregister
     */
    function unregisterFactory(address factory) external;

    /**
     * @dev Check if an address is a registered factory
     * @param factory The address to check
     * @return bool True if the address is a registered factory, false otherwise
     */
    function isFactory(address factory) external view returns (bool);

    /**
     * @dev Transfers ownership of the contract to a new account
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external;
}
