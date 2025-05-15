// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IGovernment.sol";

/**
 * @title Government
 * @dev Implementation of the Government contract that manages citizen addresses
 */
abstract contract Government is IGovernment, Ownable {
    // Mapping to track registered citizens
    mapping(address => bool) private _citizens;

    /**
     * @dev Constructor that sets the deployer as the owner
     * @param governmentOwner The address that will own this government
     */
    constructor(address governmentOwner) Ownable(governmentOwner) {}

    /**
     * @dev Override of the transferOwnership function to emit our custom event
     * @param newOwner The address of the new owner
     */
    function transferOwnership(
        address newOwner
    ) public override(Ownable, IGovernment) onlyOwner {
        super.transferOwnership(newOwner);
        emit OwnershipTransferred(owner(), newOwner);
    }
}
