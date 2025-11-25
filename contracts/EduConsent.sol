// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./EduIdentity.sol";
import "./EduToken.sol";

/**
 * @title EduConsent
 * @notice Manages consent and data access logging with token rewards
 * @dev Optimized with custom errors and struct packing for reduced gas costs
 */
contract EduConsent {
    // Custom errors for gas optimization
    error NotAStudent();
    error NotARegisteredRequester();
    error InvalidDuration();
    error ConsentDoesNotExist();
    error NotConsentOwner();
    error AlreadyRevoked();
    error NoValidConsent();
    error InvalidIdentityAddress();
    error InvalidTokenAddress();

    enum DataType {
        BasicProfile,      // handle, displayName, profileCid
        OffchainData,     // e.g. transcripts, certificates (off-chain reference)
    }

    // Optimized struct packing: reduced from 6 slots to 2 slots
    // Saves ~40,000 gas per new consent (3 SSTORE operations eliminated)
    struct Consent {
        address owner;         // 20 bytes - Slot 0
        uint64 expiresAt;      // 8 bytes  - Slot 0
        DataType dataType;     // 1 byte   - Slot 0
        bool exists;           // 1 byte   - Slot 0
        bool active;           // 1 byte   - Slot 0
        // 1 byte padding       - Slot 0
        address requester;     // 20 bytes - Slot 1
    }

    EduIdentity public identityContract;
    EduToken public token;

    mapping(bytes32 => Consent) public consents;

    uint256 public constant REWARD_PER_CONSENT = 10; // 10 EDU tokens

    // Events
    event ConsentGranted(
        address indexed owner,
        address indexed requester,
        DataType dataType,
        uint64 expiresAt
    );

    event ConsentRevoked(
        address indexed owner,
        address indexed requester,
        DataType dataType
    );

    event AccessAttempt(
        address indexed owner,
        address indexed requester,
        DataType indexed dataType,
        uint64 timestamp,
        bool granted
    );

    event DataAccessed(
        address indexed owner,
        address indexed requester,
        DataType indexed dataType,
        uint64 timestamp,
        string dataHash  // Hash of the accessed data for audit trail
    );

    constructor(address _identity, address _token) {
        if (_identity == address(0)) revert InvalidIdentityAddress();
        if (_token == address(0)) revert InvalidTokenAddress();

        identityContract = EduIdentity(_identity);
        token = EduToken(_token);
    }

    /**
     * @notice Generate unique key for consent
     */
    function _key(
        address owner,
        address requester,
        DataType dataType
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(owner, requester, dataType));
    }

    /**
     * @notice Grant or update consent for a requester to access specific data
     */
    function setConsent(
        address requester,
        DataType dataType,
        uint16 durationDays
    ) external {
        // Verify caller is a registered student
        if (identityContract.roles(msg.sender) != EduIdentity.Role.Student) {
            revert NotAStudent();
        }

        // Verify requester is registered
        if (identityContract.roles(requester) != EduIdentity.Role.Requester) {
            revert NotARegisteredRequester();
        }

        // Validate duration
        if (durationDays < 1 || durationDays > 365) {
            revert InvalidDuration();
        }

        bytes32 consentKey = _key(msg.sender, requester, dataType);
        uint64 expiresAt = uint64(block.timestamp + uint256(durationDays) * 1 days);

        // Create or update consent (optimized struct packing)
        consents[consentKey] = Consent({
            owner: msg.sender,
            expiresAt: expiresAt,
            dataType: dataType,
            exists: true,
            active: true,
            requester: requester
        });

        // Mint reward tokens
        token.mintTo(msg.sender, REWARD_PER_CONSENT);

        emit ConsentGranted(msg.sender, requester, dataType, expiresAt);
    }

    /**
     * @notice Revoke consent for a requester
     */
    function revokeConsent(address requester, DataType dataType) external {
        bytes32 consentKey = _key(msg.sender, requester, dataType);
        Consent storage consent = consents[consentKey];

        if (!consent.exists) revert ConsentDoesNotExist();
        if (consent.owner != msg.sender) revert NotConsentOwner();
        if (!consent.active) revert AlreadyRevoked();

        consent.active = false;

        emit ConsentRevoked(msg.sender, requester, dataType);
    }

    /**
     * @notice Check if valid consent exists
     */
    function hasValidConsent(
        address owner,
        address requester,
        DataType dataType
    ) public view returns (bool) {
        bytes32 consentKey = _key(owner, requester, dataType);
        Consent memory consent = consents[consentKey];

        return consent.exists &&
               consent.active &&
               block.timestamp <= consent.expiresAt;
    }

    /**
     * @notice Access data with consent check and logging
     * @dev Caller must be a registered requester with valid consent
     * @dev This function only manages permissions - actual data remains off-chain
     * @return profileCid Pointer to off-chain data (IPFS CID or database reference)
     */
    function accessDataAndLog(
        address owner,
        DataType dataType
    ) external returns (string memory profileCid) {
        // Verify caller is a registered requester
        if (identityContract.roles(msg.sender) != EduIdentity.Role.Requester) {
            revert NotARegisteredRequester();
        }

        bool hasConsent = hasValidConsent(owner, msg.sender, dataType);

        // Always emit access attempt for audit trail (both successful and failed)
        emit AccessAttempt(
            owner,
            msg.sender,
            dataType,
            uint64(block.timestamp),
            hasConsent
        );

        if (!hasConsent) revert NoValidConsent();

        // Get student profile and return CID (pointer to off-chain data)
        EduIdentity.StudentProfile memory profile = identityContract.getStudentProfile(owner);

        // Log successful data access with data hash for audit trail
        // Note: Actual data remains off-chain (JSON, spreadsheet, etc.)
        // Smart contract only stores permission records and access logs
        emit DataAccessed(
            owner,
            msg.sender,
            dataType,
            uint64(block.timestamp),
            profile.profileCid
        );

        return profile.profileCid;
    }

    /**
     * @notice Grant multiple consents in a single transaction
     * @dev Saves ~21,000 gas per additional consent by batching
     * @param requesters Array of requester addresses
     * @param dataTypes Array of data types corresponding to each requester
     * @param durationDays Array of durations corresponding to each consent
     */
    function setConsentBatch(
        address[] calldata requesters,
        DataType[] calldata dataTypes,
        uint16[] calldata durationDays
    ) external {
        // Verify caller is a registered student (single check for all)
        if (identityContract.roles(msg.sender) != EduIdentity.Role.Student) {
            revert NotAStudent();
        }

        uint256 length = requesters.length;
        if (length != dataTypes.length || length != durationDays.length) {
            revert InvalidDuration(); // Reusing error for array length mismatch
        }

        uint256 totalRewards = 0;

        for (uint256 i = 0; i < length; i++) {
            address requester = requesters[i];
            DataType dataType = dataTypes[i];
            uint16 duration = durationDays[i];

            // Verify requester is registered
            if (identityContract.roles(requester) != EduIdentity.Role.Requester) {
                revert NotARegisteredRequester();
            }

            // Validate duration
            if (duration < 1 || duration > 365) {
                revert InvalidDuration();
            }

            bytes32 consentKey = _key(msg.sender, requester, dataType);
            uint64 expiresAt = uint64(block.timestamp + uint256(duration) * 1 days);

            // Create or update consent
            consents[consentKey] = Consent({
                owner: msg.sender,
                expiresAt: expiresAt,
                dataType: dataType,
                exists: true,
                active: true,
                requester: requester
            });

            totalRewards += REWARD_PER_CONSENT;

            emit ConsentGranted(msg.sender, requester, dataType, expiresAt);
        }

        // Mint all rewards in a single call
        if (totalRewards > 0) {
            token.mintTo(msg.sender, totalRewards);
        }
    }

    /**
     * @notice Get consent details
     */
    function getConsent(
        address owner,
        address requester,
        DataType dataType
    ) view external returns (Consent memory) {
        bytes32 consentKey = _key(owner, requester, dataType);
        return consents[consentKey];
    }
}

