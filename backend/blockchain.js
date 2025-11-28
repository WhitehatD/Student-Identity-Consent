import { ethers } from 'ethers';
import { eduConsentAbi, eduIdentityAbi, eduTokenAbi, CONTRACTS } from '@student-identity-platform/shared';

// Initialize provider and contracts
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');

const consentContractAddress = CONTRACTS.EduConsent;
const identityContractAddress = CONTRACTS.EduIdentity;
const tokenContractAddress = CONTRACTS.EduToken;

// Initialize contract instances with shared ABIs
const consentContract = new ethers.Contract(
    consentContractAddress,
    eduConsentAbi,
    provider
);

const identityContract = new ethers.Contract(
    identityContractAddress,
    eduIdentityAbi,
    provider
);

const tokenContract = new ethers.Contract(
    tokenContractAddress,
    eduTokenAbi,
    provider
);

/**
 * Validate and normalize an Ethereum address
 * @param {string} address - Ethereum address to validate
 * @returns {string} - Checksummed address
 * @throws {Error} - If address is invalid
 */
function validateAddress(address) {
    if (!address) {
        throw new Error('Address is required');
    }

    if (!ethers.isAddress(address)) {
        throw new Error(`Invalid Ethereum address: ${address}`);
    }

    return ethers.getAddress(address);
}

/**
 * Check if a requester has valid consent to access a specific data type
 * @param {string} ownerAddress - Student/owner's wallet address
 * @param {string} requesterAddress - Requester's wallet address
 * @param {number} dataType - Data type ID (0-2)
 * @returns {Promise<boolean>}
 */
export async function hasValidConsent(ownerAddress, requesterAddress, dataType) {
    try {
        const validOwnerAddress = validateAddress(ownerAddress);
        const validRequesterAddress = validateAddress(requesterAddress);

        const hasConsent = await consentContract.hasValidConsent(
            validOwnerAddress,
            validRequesterAddress,
            dataType
        );
        return hasConsent;
    } catch (error) {
        console.error(`Error checking consent (owner: ${ownerAddress}, requester: ${requesterAddress}, dataType: ${dataType}):`, error.message);
        return false;
    }
}

/**
 * Get the full consent details for a specific data type
 * @param {string} ownerAddress - Student/owner's wallet address
 * @param {string} requesterAddress - Requester's wallet address
 * @param {number} dataType - Data type ID (0: BasicProfile, 1: AcademicRecord, 2: SocialProfile)
 * @returns {Promise<Object>}
 */
export async function getConsentDetails(ownerAddress, requesterAddress, dataType) {
    try {
        const validOwnerAddress = validateAddress(ownerAddress);
        const validRequesterAddress = validateAddress(requesterAddress);

        const consent = await consentContract.getConsent(validOwnerAddress, validRequesterAddress, dataType);

        return {
            owner: consent.owner,
            expiresAt: consent.expiresAt.toString(),
            dataType: Number(consent.dataType),
            exists: consent.exists,
            active: consent.active,
            requester: consent.requester
        };
    } catch (error) {
        console.error('Error getting consent details:', error);
        return null;
    }
}

/**
 * Check if a requester has consent for multiple data types
 * @param {string} studentAddress - Student's wallet address
 * @param {string} requesterAddress - Requester's wallet address
 * @param {number[]} dataTypes - Array of data type IDs
 * @returns {Promise<Object>} - Map of dataType to boolean
 */
export async function checkMultipleConsents(studentAddress, requesterAddress, dataTypes) {
    const results = {};

    for (const dataType of dataTypes) {
        results[dataType] = await hasValidConsent(studentAddress, requesterAddress, dataType);
    }

    return results;
}

export { consentContract, identityContract, tokenContract, provider };
export { consentContractAddress, identityContractAddress, tokenContractAddress };

export default {
    hasValidConsent,
    getConsentDetails,
    checkMultipleConsents,
    contracts: {
        consent: consentContract,
        identity: identityContract,
        token: tokenContract
    },
    addresses: {
        consent: consentContractAddress,
        identity: identityContractAddress,
        token: tokenContractAddress
    }
};

