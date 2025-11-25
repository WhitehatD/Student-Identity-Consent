import type { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { hardhat, localhost } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

// NOTE: The `account` property is available on the `injected` connector
// and can be used to create a burner wallet.
export const config = createConfig({
    chains: [localhost, hardhat],
    connectors: [
        injected({
            target: "metaMask", // Can be any known injected wallet
        }),
    ],
    transports: {
        [localhost.id]: http(),
        [hardhat.id]: http(),
    },
});

export function Web3Provider({ children }: { children: ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}