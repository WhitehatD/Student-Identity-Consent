import { useAccount, useReadContract } from "wagmi";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import DataAccess from "@/components/DataAccess";
import { Button } from "@/components/ui/button";
import { useContracts } from "@/lib/contractsContext";

export default function RequesterPage() {
    const { address, isConnected } = useAccount();
    const { addresses, eduIdentityAbi } = useContracts();
    const contractAddress = addresses.eduIdentity as `0x${string}`;

    const { data: isRequester, isLoading: isRequesterLoading } = useReadContract({
        address: contractAddress,
        abi: eduIdentityAbi,
        functionName: "isRequester",
        args: [address!],
        query: { enabled: isConnected },
    });

    const { data: requesterProfile, isLoading: profileLoading } = useReadContract({
        address: contractAddress,
        abi: eduIdentityAbi,
        functionName: "getRequesterProfile",
        args: [address!],
        query: { enabled: isConnected && !!isRequester },
    });

    const isLoading = isRequesterLoading || profileLoading;

    const renderContent = () => {
        if (!isConnected) {
            return (
                <div className="text-center">
                    <p className="text-slate-400">Please connect your wallet to view your requester profile.</p>
                    <Link to="/register">
                        <Button className="mt-4">Connect Wallet</Button>
                    </Link>
                </div>
            );
        }
        if (isLoading) {
            return <p className="text-slate-400 text-center">Loading requester status...</p>;
        }
        if (isRequester && requesterProfile) {
            return (
                <div className="grid gap-8 md:grid-cols-2">
                    <Card className="bg-slate-900/60 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-slate-50">Your Requester Profile</CardTitle>
                            <CardDescription>This is your organization's on-chain identity.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Name</Label>
                                <p className="text-lg font-bold">{requesterProfile.name}</p>
                            </div>
                            <div>
                                <Label>Description</Label>
                                <p className="text-base">{requesterProfile.description}</p>
                            </div>
                            <div>
                                <Label>Website</Label>
                                <a href={requesterProfile.appUri} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                                    {requesterProfile.appUri}
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                    <DataAccess />
                </div>
            );
        }
        return (
            <div className="text-center">
                <p className="text-slate-400">This wallet is not registered as a requester.</p>
                <Link to="/register">
                    <Button variant="secondary" className="mt-4">Go to Registration</Button>
                </Link>
            </div>
        );
    };

    return (
        <main className="min-h-[calc(100vh-56px)] bg-slate-950 text-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
                <header className="space-y-2">
                    <h1 className="text-2xl font-semibold">Requester Portal</h1>
                    <p className="text-slate-400 text-sm">
                        View your organization's profile and check data access permissions.
                    </p>
                </header>
                {renderContent()}
            </div>
        </main>
    );
}
