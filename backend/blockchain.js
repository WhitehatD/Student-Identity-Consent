import { ethers } from 'ethers';
import { eduConsentAbi, eduIdentityAbi, eduTokenAbi, CONTRACTS } from '@student-identity-platform/shared';


const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');

const consentContractAddress = CONTRACTS.EduConsent;
const identityContractAddress = CONTRACTS.EduIdentity;
const tokenContractAddress = CONTRACTS.EduToken;


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

function validateAddress(address) {
    if (!address) {
        throw new Error('Address is required');
    }

    if (!ethers.isAddress(address)) {
        throw new Error(`Invalid Ethereum address: ${address}`);
    }

    return ethers.getAddress(address);
}

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
