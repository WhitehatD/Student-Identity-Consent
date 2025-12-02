import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import Home from "./pages/Home";
import StudentPage from "./pages/StudentPage";
import RequesterPage from "./pages/RequesterPage";
import SearchPage from "./pages/SearchPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import { Button } from "./components/ui/button";
import { switchToHardhatNetwork } from "./lib/wallet";
import { config as appConfig } from "./config";

function AppContent() {
    const { address, isConnected } = useAccount();
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();
    const chainId = useChainId();
    const navigate = useNavigate();

    useEffect(() => {
        if (isConnected) {
            console.log('Connected! Chain ID:', chainId);
            if (chainId !== 31337) {
                console.log('Wrong network detected. Current:', chainId, 'Expected: 31337');
                console.log('Please switch to Hardhat Local network in MetaMask');
            } else {
                console.log('Connected to Hardhat Local (31337)');
            }
        }
    }, [isConnected, chainId]);

    useEffect(() => {
        if (!window.ethereum) return;

        const handleChainChanged = (newChainId: string) => {
            console.log('Network changed to:', newChainId);
            window.location.reload();
        };

        window.ethereum.on('chainChanged', handleChainChanged);

        return () => {
            window.ethereum?.removeListener('chainChanged', handleChainChanged);
        };
    }, []);

    const handleConnect = async () => {
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
                console.log('Wrong network, attempting to switch to Hardhat...');
                const switched = await switchToHardhatNetwork();
                if (!switched) {
                    alert('Please switch to Hardhat Local network in MetaMask to continue.\n\nNetwork: Hardhat Local\nChain ID: 31337\nRPC URL: http://localhost:8545');
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            const metaMaskConnector = connectors[0]; 
            if (metaMaskConnector) {
                await connect({ connector: metaMaskConnector });
                navigate("/register");
            }
        } catch (error) {
            console.error('Failed to connect:', error);
            alert('Failed to connect. Make sure you\'re on Hardhat Local network.');
        }
    };

    const handleDisconnect = () => {
        disconnect();
        navigate("/");
    };

    return (
        <>
            <header className="w-full bg-slate-950/80 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
                <div className="text-lg font-semibold text-slate-50">
                    EduCon<span className="text-emerald-400"></span>
                </div>

                <nav className="flex items-center gap-6 text-sm text-slate-300">
                    <Link to="/" className="hover:text-slate-50">
                        Home
                    </Link>
                    <Link to="/search" className="hover:text-slate-50">
                        Search
                    </Link>
                    {isConnected && (
                        <>
                            <Link to="/student" className="hover:text-slate-50">
                                My Student Profile
                            </Link>
                            <Link to="/requester" className="hover:text-slate-50">
                                My Requester Profile
                            </Link>
                        </>
                    )}
                </nav>

                <div>
                    {isConnected && address ? (
                        <div className="flex items-center gap-4">
                            {chainId !== appConfig.chainId && (
                                <div className="rounded-full bg-yellow-500/20 border border-yellow-500/50 px-3 py-1 text-xs text-yellow-400 flex items-center gap-2">
                                    Wrong Network
                                </div>
                            )}
                            <div className="rounded-full bg-slate-800 px-4 py-1 text-xs font-mono text-slate-200">
                                {address.slice(0, 6)}...{address.slice(-4)}
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleDisconnect}
                            >
                                Disconnect
                            </Button>
                        </div>
                    ) : (
                        <Button
                            onClick={handleConnect}
                            className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-medium text-slate-950 hover:bg-emerald-400"
                        >
                            Connect Wallet
                        </Button>
                    )}
                </div>
            </header>

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/student" element={<StudentPage />} />
                <Route path="/requester" element={<RequesterPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/profile/:address" element={<ProfilePage />} />
            </Routes>
        </>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}
