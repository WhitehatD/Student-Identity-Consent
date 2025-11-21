// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title EduToken
 * @notice ERC-20 reward token for students who share data
 * @dev Optimized with custom errors for reduced gas costs
 */
contract EduToken is ERC20 {
    // Custom errors for gas optimization
    error NotConsentContract();
    error AlreadySet();
    error InvalidAddress();

    address public consentContract;

    event ConsentContractSet(address indexed consentContract);

    constructor() ERC20("EduShare Token", "EDU") {
        // Start with zero supply; minting happens via EduConsent
    }

    modifier onlyConsent() {
        if (msg.sender != consentContract) revert NotConsentContract();
        _;
    }

    /**
     * @notice Set the consent contract address (can only be set once)
     */
    function setConsentContract(address _consent) external {
        if (consentContract != address(0)) revert AlreadySet();
        if (_consent == address(0)) revert InvalidAddress();

        consentContract = _consent;
        emit ConsentContractSet(_consent);
    }

    /**
     * @notice Mint tokens to an address (only callable by consent contract)
     */
    function mintTo(address to, uint256 amount) external onlyConsent {
        _mint(to, amount);
    }
}

