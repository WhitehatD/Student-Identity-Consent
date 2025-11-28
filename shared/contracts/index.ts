/**
 * Shared Contract Configuration
 *
 * This module exports all contract ABIs and addresses.
 * Used by both frontend and backend to ensure consistency.
 */

export { eduConsentAbi } from './eduConsent';
export { eduIdentityAbi } from './eduIdentity';
export { eduTokenAbi } from './eduToken';
export { addresses } from './addresses';

import { addresses as addr } from './addresses';

export const CONTRACTS = {
    EduIdentity: addr.eduIdentity,
    EduToken: addr.eduToken,
    EduConsent: addr.eduConsent,
} as const;

export const DataType = {
    BasicProfile: 0,
    AcademicRecord: 1,
    SocialProfile: 2
} as const;

export function getDataTypeName(dataType: number): string {
    const names = {
        0: "Basic Profile",
        1: "Academic Record",
        2: "Social Profile"
    };
    return names[dataType as keyof typeof names] || "Unknown";
}

