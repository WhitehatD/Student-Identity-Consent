// src/App.tsx
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import Home from "./pages/Home";
import StudentPage from "./pages/StudentPage";
import RequesterPage from "./pages/RequesterPage";
import SearchPage from "./pages/SearchPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import { Button } from "./components/ui/button"; // <-- Import Button

const PK_STORAGE_KEY = "burner-private-key";

// A wrapper component to use useNavigate in the App component
function AppContent() {
    const { address, isConnected } = useAccount();
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    const navigate = useNavigate();

    useEffect(() => {
        if (isConnected) return; // Prevent re-connecting on every render
        let pk = localStorage.getItem(PK_STORAGE_KEY);
        if (!pk) {
            pk = generatePrivateKey();
            localStorage.setItem(PK_STORAGE_KEY, pk);
        }
        const account = privateKeyToAccount(pk as `0x${string}`);
        
        connect({ connector: injected(), account });
    }, [connect, isConnected]);

    return (
        <>
            {/* NAVBAR */}
            <header className="w-full bg-slate-950/80 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
                {/* left: logo */}
                <div className="text-lg font-semibold text-slate-50">
                    EduChain<span className="text-emerald-400">.demo</span>
                </div>

                {/* middle: links */}
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

                {/* right: wallet status */}
                <div>
                    {isConnected && address ? (
                        <div className="flex items-center gap-4">
                            <div className="rounded-full bg-slate-800 px-4 py-1 text-xs font-mono text-slate-200">
                                {address.slice(0, 6)}...{address.slice(-4)}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => disconnect()}
                                className="border-slate-700 text-slate-200 hover:bg-slate-800"
                            >
                                Disconnect
                            </Button>
                        </div>
                    ) : (
                        <Button
                            onClick={() => navigate("/register")}
                            className="rounded-full bg-emerald-500 px-4 py-1 text-xs font-medium text-slate-950 hover:bg-emerald-400"
                        >
                            Register / Connect
                        </Button>
                    )}
                </div>
            </header>

            {/* ROUTES */}
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