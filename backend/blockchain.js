import { ethers } from 'ethers';
import { eduConsentAbi, eduIdentityAbi, eduTokenAbi, CONTRACTS } from '@student-identity-platform/shared';


const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');

function validateAddress(address) {
    if (!address) {
        throw new Error('Address is required');
    }

    try {
        return ethers.getAddress(address);
    } catch (error) {
        if (typeof address === 'string') {
            try {
                return ethers.getAddress(address.toLowerCase());
            } catch (innerError) {
                throw new Error(`Invalid Ethereum address: ${address}`);
            }
        }
        throw new Error(`Invalid Ethereum address: ${address}`);
    }
}

const consentContractAddress = validateAddress(CONTRACTS.EduConsent);
const identityContractAddress = validateAddress(CONTRACTS.EduIdentity);
const tokenContractAddress = validateAddress(CONTRACTS.EduToken);


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

export async function getConsentLogs(studentAddress) {
    try {
        const validStudentAddress = validateAddress(studentAddress);

        const grantFilter = consentContract.filters.ConsentGranted(validStudentAddress);
        const grantLogs = await consentContract.queryFilter(grantFilter);

        const revokeFilter = consentContract.filters.ConsentRevoked(validStudentAddress);
        const revokeLogs = await consentContract.queryFilter(revokeFilter);

        const consents = new Map();

        for (const log of grantLogs) {
            let args = log.args;
            if (!args) {
                try {
                    const parsed = consentContract.interface.parseLog({ topics: log.topics, data: log.data });
                    args = parsed ? parsed.args : null;
                } catch (e) {
                    console.warn("Failed to parse grant log:", e);
                }
            }

            if (args) {
                const { requester, dataType, expiresAt } = args;
                const id = `${requester}-${dataType}`;
                consents.set(id, {
                    id,
                    requester,
                    dataType: Number(dataType),
                    expiresAt: expiresAt.toString(),
                    status: 'active',
                    blockNumber: log.blockNumber
                });
            }
        }
        for (const log of revokeLogs) {
            let args = log.args;
            if (!args) {
                try {
                    const parsed = consentContract.interface.parseLog({ topics: log.topics, data: log.data });
                    args = parsed ? parsed.args : null;
                } catch (e) {
                    console.warn("Failed to parse revoke log:", e);
                }
            }

            if (args) {
                const { requester, dataType } = args;
                const id = `${requester}-${dataType}`;
                if (consents.has(id)) {
                    if (log.blockNumber > consents.get(id).blockNumber) {
                        consents.get(id).status = 'revoked';
                    }
                }
            }
        }

        return Array.from(consents.values());
    } catch (error) {
        console.error('Error fetching consent logs:', error);
        return [];
    }
}

export { consentContract, identityContract, tokenContract, provider };
export { consentContractAddress, identityContractAddress, tokenContractAddress };

export default {
    hasValidConsent,
    getConsentDetails,
    hasValidConsent,
    getConsentDetails,
    checkMultipleConsents,
    getConsentLogs,

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
