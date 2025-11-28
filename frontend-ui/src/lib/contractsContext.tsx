import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { config } from "@/config";

type ContractAddresses = {
    eduIdentity: string;
    eduToken: string;
    eduConsent: string;
};

type ContractAbi = readonly unknown[];

type ContractsData = {
    addresses: ContractAddresses;
    eduIdentityAbi: ContractAbi;
    eduConsentAbi: ContractAbi;
    eduTokenAbi: ContractAbi;
};

type ContractsState =
    | { status: "loading" }
    | { status: "error"; error: string }
    | { status: "ready"; data: ContractsData };

type ContractsResponse = {
    success: boolean;
    message?: string;
    addresses?: ContractAddresses;
    abis?: {
        eduIdentity?: ContractAbi;
        eduConsent?: ContractAbi;
        eduToken?: ContractAbi;
    };
};

const ContractsContext = createContext<ContractsData | null>(null);

const CONTRACTS_ENDPOINT = `${config.apiBaseUrl.replace(/\/$/, "")}/api/contracts/meta`;
const RETRY_DELAY_MS = 1500;
const MAX_ATTEMPTS = 60;

function isHexAddress(value: unknown): value is `0x${string}` {
    return typeof value === "string" && value.startsWith("0x") && value.length === 42;
}

function isValidAddresses(addresses: ContractAddresses | undefined): addresses is ContractAddresses {
    return Boolean(
        addresses &&
        isHexAddress(addresses.eduIdentity) &&
        isHexAddress(addresses.eduToken) &&
        isHexAddress(addresses.eduConsent)
    );
}

function isValidAbi(value: unknown): value is ContractAbi {
    return Array.isArray(value) && value.length > 0;
}

function ContractsLoader({ message, allowRetry }: { message: string; allowRetry?: boolean }) {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-center text-slate-300 px-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400" />
            <p>{message}</p>
            {allowRetry && (
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="text-sm text-emerald-300 underline-offset-4 hover:underline"
                >
                    Retry
                </button>
            )}
        </div>
    );
}

export function ContractsProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<ContractsState>({ status: "loading" });

    useEffect(() => {
        let cancelled = false;
        let attempt = 0;
        let retryHandle: ReturnType<typeof setTimeout> | undefined;

        const fetchContracts = async () => {
            attempt += 1;
            try {
                const response = await fetch(CONTRACTS_ENDPOINT, {
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error(`Contracts endpoint returned ${response.status}`);
                }

                const payload = (await response.json()) as ContractsResponse;
                if (!payload.success) {
                    throw new Error(payload.message || "Contracts not ready");
                }

                if (!isValidAddresses(payload.addresses)) {
                    throw new Error("Contract addresses are not ready yet");
                }

                const identityAbi = payload?.abis?.eduIdentity;
                const consentAbi = payload?.abis?.eduConsent;
                const tokenAbi = payload?.abis?.eduToken;

                if (!isValidAbi(identityAbi) || !isValidAbi(consentAbi) || !isValidAbi(tokenAbi)) {
                    throw new Error("Contract ABIs are missing");
                }

                if (cancelled) {
                    return;
                }

                setState({
                    status: "ready",
                    data: {
                        addresses: payload.addresses,
                        eduIdentityAbi: identityAbi,
                        eduConsentAbi: consentAbi,
                        eduTokenAbi: tokenAbi,
                    },
                });
            } catch (error) {
                console.warn("Contracts metadata not ready yet:", error);

                if (cancelled) {
                    return;
                }

                if (attempt >= MAX_ATTEMPTS) {
                    setState({
                        status: "error",
                        error:
                            error instanceof Error
                                ? error.message
                                : "Unable to load contract metadata. Please verify that Hardhat and the backend are running.",
                    });
                    return;
                }

                retryHandle = setTimeout(fetchContracts, RETRY_DELAY_MS);
            }
        };

        fetchContracts();

        return () => {
            cancelled = true;
            if (retryHandle) {
                clearTimeout(retryHandle);
            }
        };
    }, []);

    if (state.status === "loading") {
        return <ContractsLoader message="Waiting for contracts to become available..." />;
    }

    if (state.status === "error") {
        return <ContractsLoader message={state.error} allowRetry />;
    }

    return (
        <ContractsContext.Provider value={state.data}>
            {children}
        </ContractsContext.Provider>
    );
}

export function useContracts() {
    const ctx = useContext(ContractsContext);
    if (!ctx) {
        throw new Error("useContracts must be used within a ContractsProvider");
    }
    return ctx;
}
