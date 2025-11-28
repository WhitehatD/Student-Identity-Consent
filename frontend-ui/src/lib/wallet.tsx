import type { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { hardhat } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config as appConfig } from "../config";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false
        },
    },
});

const RPC_URL = import.meta.env.VITE_RPC_URL;

console.log('Configured RPC URL:', RPC_URL);

// Configure Hardhat local network (chain ID 31337)
const localhardhat = {
    ...hardhat,
    rpcUrls: {
        default: {
            http: [appConfig.rpcUrl],
        },
        public: {
            http: [appConfig.rpcUrl],
        },
    },
};

// MetaMask-specific connector that only targets MetaMask since it supports local networks
const metaMaskConnector = injected({
    target() {
        return {
            id: 'metaMask',
            name: 'MetaMask',
            provider(win) {
                if (!win?.ethereum) return undefined;
                return win.ethereum.providers?.find((p) => p.isMetaMask)
                    || (win.ethereum.isMetaMask ? win.ethereum : undefined);
            },
        };
    },
});

export const config = createConfig({
    chains: [localhardhat],
    connectors: [metaMaskConnector],
    transports: {
        [localhardhat.id]: http(appConfig.rpcUrl),
    },
});

// Helper function to add Hardhat network to MetaMask
export async function addHardhatNetwork() {
    if (!window.ethereum) {
        alert('MetaMask is not installed!');
        return false;
    }

    try {
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: '0x7A69', // 31337 in hex
                chainName: appConfig.chainName,
                nativeCurrency: {
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18,
                },
                rpcUrls: [appConfig.rpcUrl],
                blockExplorerUrls: null,
            }],
        });
        return true;
    } catch (error) {
        console.error('Failed to add Hardhat network:', error);
        return false;
    }
}

// Helper function to switch to Hardhat network
export async function switchToHardhatNetwork() {
    if (!window.ethereum) {
        alert('MetaMask is not installed!');
        return false;
    }

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7A69' }], // 31337 in hex
        });
        return true;
    } catch (error: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (error.code === 4902) {
            return await addHardhatNetwork();
        }
        console.error('Failed to switch to Hardhat network:', error);
        return false;
    }
}

export function Web3Provider({ children }: { children: ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}