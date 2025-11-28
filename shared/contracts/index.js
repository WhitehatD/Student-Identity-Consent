/**
 * Shared Contract Configuration
 *
 * This module exports all contract ABIs and addresses.
 * Used by both frontend and backend to ensure consistency.
 */

import { eduConsentAbi } from './eduConsent.js';
import { eduIdentityAbi } from './eduIdentity.js';
import { eduTokenAbi } from './eduToken.js';
import { addresses } from './addresses.js';

export { eduConsentAbi, eduIdentityAbi, eduTokenAbi, addresses };

export const CONTRACTS = {
    EduIdentity: addresses.eduIdentity,
    EduToken: addresses.eduToken,
    EduConsent: addresses.eduConsent,
};

export const DataType = {
    BasicProfile: 0,
    AcademicRecord: 1,
    SocialProfile: 2
};

export function getDataTypeName(dataType) {
    const names = {
        0: "Basic Profile",
        1: "Academic Record",
        2: "Social Profile"
    };
    return names[dataType] || "Unknown";
}

