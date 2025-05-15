// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IGovernmentFactory.sol";
import "./ConcreteGovernment.sol";
import "./BaseFactory.sol";

/**
 * @title GovernmentFactory
 * @dev Factory contract for creating Government contracts
 * Only the BaseFactory owner can create governments
 */
contract GovernmentFactory is IGovernmentFactory {
    // Reference to the BaseFactory contract
    BaseFactory private _baseFactory;

    // Mapping to track created governments
    mapping(address => bool) private _governments;

    /**
     * @dev Constructor that sets the BaseFactory reference
     * @param baseFactory The address of the BaseFactory contract
     */
    constructor(address baseFactory) {
        if (baseFactory == address(0)) {
            revert ZeroAddressNotAllowed();
        }
        _baseFactory = BaseFactory(baseFactory);
    }

    /**
     * @dev Create a new government with the specified owner
     * Only callable by the owner of the BaseFactory
     * @param governmentOwner The address that will own the government
     * @return government The address of the newly created government
     */
    function createGovernment(
        address governmentOwner
    ) external override returns (address) {
        // Check if the caller is the owner of BaseFactory
        if (msg.sender != _baseFactory.owner()) {
            revert NotAuthorized();
        }

        // Check if government owner is valid
        if (governmentOwner == address(0)) {
            revert ZeroAddressNotAllowed();
        } // Create a new ConcreteGovernment contract
        ConcreteGovernment government = new ConcreteGovernment(governmentOwner);

        // Register the government in our mapping
        _governments[address(government)] = true;

        // Emit event
        emit GovernmentCreated(address(government), governmentOwner);

        return address(government);
    }

    /**
     * @dev Check if an address is a government created by this factory
     * @param government The address to check
     * @return bool True if the address is a government, false otherwise
     */
    function isGovernment(
        address government
    ) external view override returns (bool) {
        return _governments[government];
    }
}
