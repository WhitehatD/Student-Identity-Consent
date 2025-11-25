// src/pages/ProfilePage.tsx
import { useParams } from "react-router-dom";
import { useReadContract } from "wagmi";
import { addresses } from "@/contracts/addresses";
import { eduIdentityAbi } from "@/abi/eduIdentity";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
    const { address } = useParams<{ address: `0x${string}` }>();

    // 1. Determine the user's role
    const { data: role, isLoading: isLoadingRole } = useReadContract({
        address: addresses.eduIdentity,
        abi: eduIdentityAbi,
        functionName: "roles",
        args: [address!],
        query: { enabled: !!address },
    });

    // 2. Fetch student profile if role is Student (1)
    const { data: studentProfile, isLoading: isLoadingStudent } = useReadContract({
        address: addresses.eduIdentity,
        abi: eduIdentityAbi,
        functionName: "getStudentProfile",
        args: [address!],
        query: { enabled: !!address && role === 1 },
    });

    // 3. Fetch requester profile if role is Requester (2)
    const { data: requesterProfile, isLoading: isLoadingRequester } = useReadContract({
        address: addresses.eduIdentity,
        abi: eduIdentityAbi,
        functionName: "getRequesterProfile",
        args: [address!],
        query: { enabled: !!address && role === 2 },
    });

    const isLoading = isLoadingRole || isLoadingStudent || isLoadingRequester;

    const renderProfile = () => {
        if (isLoading) {
            return <p className="text-slate-400">Loading profile...</p>;
        }

        if (role === 1 && studentProfile) {
            return (
                <Card className="bg-slate-900/60 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-slate-50">Student Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="font-mono text-xs text-slate-400 break-all">{address}</p>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label>Handle</Label>
                                <p className="text-lg font-mono text-emerald-400">@{studentProfile.handle}</p>
                            </div>
                            <div>
                                <Label>Display Name</Label>
                                <p className="text-lg">{studentProfile.displayName}</p>
                            </div>
                        </div>
                        <div>
                            <Label>University</Label>
                            <p className="text-lg">{studentProfile.university}</p>
                        </div>
                        <Button className="mt-4">Request Data Access (UI Only)</Button>
                    </CardContent>
                </Card>
            );
        }

        if (role === 2 && requesterProfile) {
            return (
                <Card className="bg-slate-900/60 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-slate-50">Requester Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="font-mono text-xs text-slate-400 break-all">{address}</p>
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
            );
        }

        return <p className="text-red-400">Could not load profile for this address.</p>;
    };

    return (
        <main className="min-h-[calc(100vh-56px)] bg-slate-950 text-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-10">
                {renderProfile()}
            </div>
        </main>
    );
}