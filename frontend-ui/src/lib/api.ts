import { config } from "@/config";

const API_BASE = config.apiBaseUrl.replace(/\/$/, "") + "/api";

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || `API Error: ${res.status}`);
    }
    return (await res.json()) as T;
}

export const api = {
    getWallet: (address: string) => fetchJson<{ success: boolean; wallet: any }>(`/wallet/${address}`),

    registerWallet: async (walletAddress: string, displayName: string) => {
        const res = await fetch(`${API_BASE}/wallets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress, displayName })
        });

        if (res.status === 409) {
            return (await res.json()) as { success: boolean; cid: string; wallet: any };
        }

        if (!res.ok) {
            const error = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(error.message || `API Error: ${res.status}`);
        }

        return (await res.json()) as { success: boolean; cid: string; wallet: any };
    },

    getRole: (address: string) => fetchJson<{ success: boolean; role: number }>(`/blockchain/role/${address}`),

    getStudentProfile: (address: string) => fetchJson<{
        success: boolean;
        profile: {
            registered: boolean;
            handle: string;
            displayName: string;
            university: string;
            enrollmentYear: string;
            emailHash: string;
            profileCid: string;
        }
    }>(`/blockchain/student/${address}`),

    getRequesterProfile: (address: string) => fetchJson<{
        success: boolean;
        profile: {
            registered: boolean;
            name: string;
            description: string;
            appUri: string;
        }
    }>(`/blockchain/requester/${address}`),

    getStudentConsents: (address: string) => fetchJson<{
        success: boolean;
        consents: Array<{
            id: string;
            requester: string;
            dataType: number;
            expiresAt: string;
            status: 'active' | 'revoked';
            blockNumber: number;
        }>
    }>(`/blockchain/student/${address}/consents`),

    getStudentData: (cid: string, requesterAddress: string) => fetchJson<{
        success: boolean;
        studentAddress: string;
        data: {
            basicProfile: any;
            academicRecord: any;
            socialProfile: any;
        };
        consents: Record<number, boolean>;
    }>(`/student-data/${cid}`, {
        headers: {
            'X-Requester-Address': requesterAddress
        }
    }),

    getConsent: (studentAddress: string, requesterAddress: string, dataType: number) => fetchJson<{
        success: boolean;
        consent: {
            owner: string;
            requester: string;
            dataType: number;
            expiresAt: string;
            exists: boolean;
            active: boolean;
            isCurrentlyValid: boolean;
            dataTypeName: string;
        }
    }>(`/blockchain/consent/${studentAddress}/${requesterAddress}/${dataType}`),
};
