// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Government.sol";

/**
 * @title ConcreteGovernment
 * @dev Concrete implementation of the abstract Government contract for testing
 */
contract ConcreteGovernment is Government {
    /**
     * @dev Constructor that sets the owner
     * @param governmentOwner The address that will own this government
     */
    constructor(address governmentOwner) Government(governmentOwner) {}
}
