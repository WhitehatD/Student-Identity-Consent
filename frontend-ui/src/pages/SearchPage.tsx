// src/pages/SearchPage.tsx
import { useState, useEffect, useMemo } from "react";
import { usePublicClient } from "wagmi";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { addresses } from "@/contracts/addresses";
import { eduIdentityAbi } from "@/abi/eduIdentity";
import { parseAbiItem } from "viem";

// --- Types ---

type User = {
    address: `0x${string}`;
    handle?: string; // For students
    name?: string;   // For requesters
    role: "Student" | "Requester";
};

// --- Component ---

export default function SearchPage() {
    const publicClient = usePublicClient();
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // --- Data Fetching ---

    useEffect(() => {
        if (!publicClient) return;

        const fetchUsers = async () => {
            setIsLoading(true);
            const users: User[] = [];

            // 1. Fetch all registered students
            const studentLogs = await publicClient.getLogs({
                address: addresses.eduIdentity as `0x${string}`,
                event: parseAbiItem('event StudentRegistered(address indexed student, string handle, bytes32 emailHash)'),
                fromBlock: 0n,
                toBlock: 'latest'
            });

            for (const log of studentLogs) {
                const { student, handle } = log.args;
                users.push({ address: student!, handle: handle!, role: "Student" });
            }

            // 2. Fetch all registered requesters
            const requesterLogs = await publicClient.getLogs({
                address: addresses.eduIdentity as `0x${string}`,
                event: parseAbiItem('event RequesterRegistered(address indexed requester, string name)'),
                fromBlock: 0n,
                toBlock: 'latest'
            });

            for (const log of requesterLogs) {
                const { requester, name } = log.args;
                users.push({ address: requester!, name: name!, role: "Requester" });
            }

            setAllUsers(users);
            setIsLoading(false);
        };

        fetchUsers();
    }, [publicClient]);

    // --- Filtering ---

    const filteredUsers = useMemo(() => {
        if (!query) return allUsers;
        const lowerCaseQuery = query.toLowerCase();
        return allUsers.filter(user =>
            user.address.toLowerCase().includes(lowerCaseQuery) ||
            (user.handle && user.handle.toLowerCase().includes(lowerCaseQuery)) ||
            (user.name && user.name.toLowerCase().includes(lowerCaseQuery))
        );
    }, [allUsers, query]);

    return (
        <main className="min-h-[calc(100vh-56px)] bg-slate-950 text-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
                <header className="space-y-2">
                    <h1 className="text-2xl font-semibold">User Directory</h1>
                    <p className="text-slate-400 text-sm">
                        Find and connect with other students and requesters on the platform.
                    </p>
                </header>

                <div className="max-w-lg">
                    <Input
                        type="search"
                        placeholder="Search by handle, name, or address..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="bg-slate-900 border-slate-700"
                    />
                </div>

                {/* Search Results */}
                <div className="space-y-4">
                    {isLoading ? (
                        <p className="text-slate-400">Loading user directory...</p>
                    ) : filteredUsers.length === 0 ? (
                        <p className="text-slate-400">No users found.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredUsers.map(user => (
                                <div key={user.address} className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
                                    <div>
                                        <p className="text-sm text-emerald-400">{user.role}</p>
                                        <p className="font-bold text-lg">
                                            {user.role === 'Student' ? `@${user.handle}` : user.name}
                                        </p>
                                        <p className="font-mono text-xs text-slate-400 break-all">{user.address}</p>
                                    </div>
                                    <div className="mt-4">
                                        <Link to={`/profile/${user.address}`}>
                                            <Button variant="outline" size="sm" className="w-full border-slate-700 text-slate-200 hover:bg-slate-800">
                                                View Profile
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}