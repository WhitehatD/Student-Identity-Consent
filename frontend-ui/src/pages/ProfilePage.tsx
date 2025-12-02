import { useParams } from "react-router-dom";
import { useReadContract } from "wagmi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useContracts } from "@/lib/contractsContext";

type StudentProfile = {
    registered: boolean;
    handle: string;
    displayName: string;
    university: string;
    enrollmentYear: number;
    emailHash: string;
    profileCid: string;
};

type RequesterProfile = {
    registered: boolean;
    name: string;
    description: string;
    appUri: string;
};

export default function ProfilePage() {
    const { address } = useParams<{ address: `0x${string}` }>();
    const { addresses, eduIdentityAbi } = useContracts();
    const eduIdentityAddress = addresses.eduIdentity as `0x${string}`;

    // Guard: Only enable contract calls if we have valid addresses
    const canCallContract = !!address && !!eduIdentityAddress;

    const { data: role, isLoading: isLoadingRole } = useReadContract({
        address: eduIdentityAddress,
        abi: eduIdentityAbi,
        functionName: "roles",
        args: [address!],
        query: { enabled: canCallContract },
    });

    const { data: studentProfile, isLoading: isLoadingStudent } = useReadContract({
        address: eduIdentityAddress,
        abi: eduIdentityAbi,
        functionName: "getStudentProfile",
        args: [address!],
        query: { enabled: canCallContract && role === 1 },
    }) as { data: StudentProfile | undefined; isLoading: boolean };

    const { data: requesterProfile, isLoading: isLoadingRequester } = useReadContract({
        address: eduIdentityAddress,
        abi: eduIdentityAbi,
        functionName: "getRequesterProfile",
        args: [address!],
        query: { enabled: canCallContract && role === 2 },
    }) as { data: RequesterProfile | undefined; isLoading: boolean };

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
                                <p className="text-lg font-mono text-slate-50">@{studentProfile.handle}</p>
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
                            <p className="text-slate-50 font-bold">{requesterProfile.name}</p>
                        </div>
                        <div>
                            <Label>Description</Label>
                            <p className="text-base text-slate-50">{requesterProfile.description}</p>
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