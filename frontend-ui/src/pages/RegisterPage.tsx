import { useState, useEffect } from "react";
import { useChainId, useAccount, useConnect } from "wagmi";
import StudentRegisterForm from "@/components/StudentRegisterForm";
import RequesterRegisterForm from "@/components/RequesterRegisterForm";
import { Button } from "@/components/ui/button";
import { switchToHardhatNetwork } from "@/lib/wallet";
import { config as appConfig } from "@/config";

type Role = "student" | "requester";

export default function RegisterPage() {
    const [selectedRole, setSelectedRole] = useState<Role>("student");
    const chainId = useChainId();
    const { isConnected } = useAccount();
    const { connect, connectors } = useConnect();
    const [isWrongNetwork, setIsWrongNetwork] = useState(false);

    useEffect(() => {
        setIsWrongNetwork(chainId !== 31337 && isConnected);
    }, [chainId, isConnected]);

    const handleConnectWallet = async () => {
        try {

            const metaMaskProvider = window.ethereum?.providers?.find((p: any) => p.isMetaMask)
                || (window.ethereum?.isMetaMask ? window.ethereum : undefined);

            if (!metaMaskProvider) {
                alert('MetaMask is not installed! Please install MetaMask to continue.');
                return;
            }

            const currentChainId = await metaMaskProvider.request({ method: 'eth_chainId' });
            console.log('Current chain ID:', currentChainId);

            if (currentChainId !== '0x7A69') {
                console.log('Wrong network, attempting to switch...');
                const switched = await switchToHardhatNetwork();
                if (!switched) {
                    alert('Please switch to Hardhat Local network in MetaMask.\n\nChain ID: 31337\nRPC URL: http://localhost:8545');
                    return;
                }

                await new Promise(resolve => setTimeout(resolve, 500));
            }

            const metaMaskConnector = connectors[0];
            if (metaMaskConnector) {
                await connect({ connector: metaMaskConnector });
            }
        } catch (error) {
            console.error('Failed to connect:', error);
            alert('Connection failed. Make sure you\'re on Hardhat Local network.');
        }
    };

    const handleSwitchNetwork = async () => {
        const success = await switchToHardhatNetwork();
        if (success) {
            setIsWrongNetwork(false);
        }
    };

    return (
        <main className="min-h-[calc(100vh-56px)] bg-slate-950 text-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
                <header className="space-y-2 text-center">
                    <h1 className="text-3xl font-semibold">Join EduChain</h1>
                    <p className="text-slate-400">
                        Create your on-chain identity to get started.
                    </p>
                </header>

                {!isConnected && (
                    <div className="max-w-2xl mx-auto p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-white">Connect Your Wallet</h3>
                                <p className="text-sm text-slate-200">
                                    Please connect MetaMask to continue. Make sure you're on {appConfig.chainName} network.
                                </p>
                            </div>
                            <Button
                                onClick={handleConnectWallet}
                                className="bg-blue-500 hover:bg-blue-400 text-white"
                            >
                                Connect MetaMask
                            </Button>
                        </div>
                    </div>
                )}

                {isConnected && isWrongNetwork && (
                    <div className="max-w-2xl mx-auto p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-white">Wrong Network</h3>
                                <p className="text-sm text-slate-200">
                                    Please switch to Hardhat Local (Chain ID: 31337) to continue
                                </p>
                            </div>
                            <Button
                                onClick={handleSwitchNetwork}
                                className="bg-yellow-500 hover:bg-yellow-400 text-black"
                            >
                                Switch Network
                            </Button>
                        </div>
                    </div>
                )}

                {isConnected && !isWrongNetwork && (
                    <>
                        <div className="flex justify-center gap-2 p-1 bg-slate-900/60 border border-slate-800 rounded-lg max-w-sm mx-auto">
                            <Button
                                variant={selectedRole === "student" ? "secondary" : "ghost"}
                                onClick={() => setSelectedRole("student")}
                                className="flex-1"
                            >
                                I am a Student
                            </Button>
                            <Button
                                variant={selectedRole === "requester" ? "secondary" : "ghost"}
                                onClick={() => setSelectedRole("requester")}
                                className="flex-1"
                            >
                                I am a Requester
                            </Button>
                        </div>

                        <div className="max-w-2xl mx-auto">
                            {selectedRole === "student" ? (
                                <StudentRegisterForm />
                            ) : (
                                <RequesterRegisterForm />
                            )}
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}