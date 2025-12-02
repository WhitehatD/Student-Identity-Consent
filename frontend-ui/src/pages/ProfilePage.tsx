import { useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { eduConsentAbi, CONTRACTS } from "@student-identity-platform/shared";
import { Loader2 } from "lucide-react";

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

const DATA_TYPES = [
    { id: "0", name: "Basic Profile" },
    { id: "1", name: "Academic Record" },
    { id: "2", name: "Social Profile" },
];

export default function ProfilePage() {
    const { address: profileAddress } = useParams<{ address: string }>();
    const { address: userAddress } = useAccount();
    const [role, setRole] = useState<number>(0);
    const [viewerRole, setViewerRole] = useState<number>(0);
    const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
    const [requesterProfile, setRequesterProfile] = useState<RequesterProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data Access State
    const [selectedDataType, setSelectedDataType] = useState<string>("0");
    const [fetchedData, setFetchedData] = useState<any>(null);
    const [accessError, setAccessError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

    const { writeContractAsync, isPending } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash as `0x${string}`,
    });

    useEffect(() => {
        if (!profileAddress) return;

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const roleData = await api.getRole(profileAddress);
                setRole(roleData.role);

                if (roleData.role === 1) {
                    const profile = await api.getStudentProfile(profileAddress);
                    setStudentProfile(profile.profile as unknown as StudentProfile);
                } else if (roleData.role === 2) {
                    const profile = await api.getRequesterProfile(profileAddress);
                    setRequesterProfile(profile.profile as unknown as RequesterProfile);
                }
                if (userAddress) {
                    const viewerRoleData = await api.getRole(userAddress);
                    setViewerRole(viewerRoleData.role);
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
                setError("Failed to load profile");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [profileAddress, userAddress]);

    useEffect(() => {
        if (isConfirmed && studentProfile && userAddress) {
            const fetchStudentData = async () => {
                try {
                    const result = await api.getStudentData(studentProfile.profileCid, userAddress);
                    setFetchedData(result.data);
                } catch (err) {
                    console.error("Error fetching student data:", err);
                    setAccessError("Failed to fetch data from backend after access grant.");
                }
            };
            fetchStudentData();
        }
    }, [isConfirmed, studentProfile, userAddress]);

    const handleRequestAccess = async () => {
        if (!profileAddress || !selectedDataType || !userAddress) return;
        setAccessError(null);
        setFetchedData(null);
        setTxHash(null);

        try {
            const hash = await writeContractAsync({
                address: CONTRACTS.EduConsent as `0x${string}`,
                abi: eduConsentAbi,
                functionName: "accessDataAndLog",
                args: [profileAddress as `0x${string}`, Number(selectedDataType)],
            });
            setTxHash(hash);
        } catch (error: any) {
            console.error("Access request failed:", error);
            setAccessError(error.message || "Failed to request access");
        }
    };

    const renderProfile = () => {
        if (isLoading) {
            return <p className="text-slate-400">Loading profile...</p>;
        }

        if (error) {
            return <p className="text-red-400">{error}</p>;
        }

        if (role === 1 && studentProfile) {
            return (
                <div className="space-y-8">
                    <Card className="bg-slate-900/60 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-slate-50">Student Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="font-mono text-xs text-slate-400 break-all">{profileAddress}</p>
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
                        </CardContent>
                    </Card>

                    {viewerRole === 2 && (
                        <Card className="bg-slate-900/60 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-slate-50">Request Data Access</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-4 items-end">
                                    <div className="space-y-2 flex-1">
                                        <Label>Select Data Type</Label>
                                        <Select value={selectedDataType} onValueChange={setSelectedDataType}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DATA_TYPES.map((type) => (
                                                    <SelectItem key={type.id} value={type.id}>
                                                        {type.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        onClick={handleRequestAccess}
                                        disabled={isPending || isConfirming}
                                        className="min-w-[140px]"
                                    >
                                        {isPending || isConfirming ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {isPending ? "Signing..." : "Confirming..."}
                                            </>
                                        ) : (
                                            "View Data"
                                        )}
                                    </Button>
                                </div>

                                {accessError && (
                                    <p className="text-sm text-red-400 mt-2">{accessError}</p>
                                )}

                                {fetchedData && (
                                    <div className="mt-6">
                                        {(() => {
                                            const typeKey =
                                                selectedDataType === "0" ? "basicProfile" :
                                                    selectedDataType === "1" ? "academicRecord" :
                                                        "socialProfile";

                                            const data = fetchedData[typeKey];

                                            if (!data) {
                                                return (
                                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                                                        <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
                                                            <span className="text-lg">🚫</span> Access Denied
                                                        </h4>
                                                        <p className="text-xs text-red-300 mt-1">
                                                            You do not have valid consent to view the <strong>{DATA_TYPES.find(t => t.id === selectedDataType)?.name}</strong>.
                                                        </p>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-medium text-emerald-400">
                                                            ✓ Data Retrieved: {DATA_TYPES.find(t => t.id === selectedDataType)?.name}
                                                        </h4>
                                                        <span className="text-xs text-slate-500 font-mono">
                                                            CID: {fetchedData.basicProfile?.cid || '...'}
                                                        </span>
                                                    </div>

                                                    <div className="p-4 bg-slate-950 rounded-md border border-slate-800 overflow-hidden">
                                                        {selectedDataType === "0" && (
                                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                                <div>
                                                                    <span className="text-slate-500 block text-xs">Display Name</span>
                                                                    <span className="text-slate-200">{data.displayName}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-slate-500 block text-xs">Wallet</span>
                                                                    <span className="text-slate-200 font-mono text-xs">{data.walletAddress}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {selectedDataType === "1" && (
                                                            <div className="space-y-6">
                                                                <div>
                                                                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Grades</h5>
                                                                    {data.grades && data.grades.length > 0 ? (
                                                                        <div className="space-y-2">
                                                                            {data.grades.map((g: any, i: number) => (
                                                                                <div key={i} className="flex justify-between items-center p-2 bg-slate-900/50 rounded border border-slate-800/50">
                                                                                    <div>
                                                                                        <p className="text-slate-200 font-medium">{g.course_name}</p>
                                                                                        <p className="text-xs text-slate-500">{g.description}</p>
                                                                                    </div>
                                                                                    <div className="text-right">
                                                                                        <span className="text-emerald-400 font-bold">{g.points}</span>
                                                                                        <span className="text-slate-600 text-xs ml-1">pts</span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-slate-500 text-xs italic">No grades recorded.</p>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Certificates</h5>
                                                                    {data.certificates && data.certificates.length > 0 ? (
                                                                        <div className="grid gap-3">
                                                                            {data.certificates.map((c: any, i: number) => (
                                                                                <div key={i} className="p-3 bg-slate-900/50 rounded border border-slate-800/50 flex justify-between items-start">
                                                                                    <div>
                                                                                        <p className="text-slate-200 font-medium">{c.certificate_name}</p>
                                                                                        <p className="text-xs text-slate-400">{c.issuing_institution}</p>
                                                                                        <p className="text-xs text-slate-500 mt-1">Issued: {new Date(c.issue_date).toLocaleDateString()}</p>
                                                                                    </div>
                                                                                    {c.transcript_uri && (
                                                                                        <a
                                                                                            href={c.transcript_uri}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-500/20 transition-colors"
                                                                                        >
                                                                                            View Cert
                                                                                        </a>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-slate-500 text-xs italic">No certificates found.</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {selectedDataType === "2" && (
                                                            <div className="text-center py-8">
                                                                <p className="text-slate-400">{data.message || "Social profile data available."}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            );
        }

        if (role === 2 && requesterProfile) {
            return (
                <Card className="bg-slate-900/60 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-slate-50">Requester Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="font-mono text-xs text-slate-400 break-all">{profileAddress}</p>
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

        return <p className="text-slate-400">Address not registered or role unknown.</p>;
    }

    return (
        <main className="min-h-[calc(100vh-56px)] bg-slate-950 text-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-10">
                {renderProfile()}
            </div>
        </main>
    );
}