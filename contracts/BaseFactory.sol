// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IBaseFactory.sol";

/**
 * @title BaseFactory
 * @dev Implementation of the BaseFactory contract that manages factory addresses
 * The contract creator is set as the super admin (owner)
 */
contract BaseFactory is IBaseFactory, Ownable {
    // Mapping to track registered factories
    mapping(address => bool) private _factories;

    /**
     * @dev Constructor that sets the deployer as the owner
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Register a new factory address
     * Only callable by the owner
     * @param factory The address of the factory to register
     */
    function registerFactory(address factory) external override onlyOwner {
        // Check if factory address is valid
        if (factory == address(0)) {
            revert ZeroAddressNotAllowed();
        }

        // Check if factory is already registered
        if (_factories[factory]) {
            revert FactoryAlreadyRegistered();
        }

        // Register the factory
        _factories[factory] = true;

        // Emit event
        emit FactoryRegistered(factory);
    }

    /**
     * @dev Unregister an existing factory address
     * Only callable by the owner
     * @param factory The address of the factory to unregister
     */
    function unregisterFactory(address factory) external override onlyOwner {
        // Check if factory is registered
        if (!_factories[factory]) {
            revert FactoryNotRegistered();
        }

        // Unregister the factory
        _factories[factory] = false;

        // Emit event
        emit FactoryUnregistered(factory);
    }

    /**
     * @dev Check if an address is a registered factory
     * @param factory The address to check
     * @return bool True if the address is a registered factory, false otherwise
     */
    function isFactory(address factory) external view override returns (bool) {
        return _factories[factory];
    }

    /**
     * @dev Override of the transferOwnership function to emit our custom event
     * @param newOwner The address of the new owner
     */
    function transferOwnership(
        address newOwner
    ) public override(Ownable, IBaseFactory) onlyOwner {
        super.transferOwnership(newOwner);
        emit OwnershipTransferred(owner(), newOwner);
    }
}
