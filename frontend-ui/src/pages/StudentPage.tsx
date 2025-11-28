import { useAccount, useReadContract } from "wagmi";
import { Link } from "react-router-dom";
import StudentProfile from "@/components/StudentProfile";
import StudentConsents from "@/components/StudentConsents";
import AuditLog from "@/components/AuditLog";
import { Button } from "@/components/ui/button";
import { useContracts } from "@/lib/contractsContext";

export default function StudentPage() {
    const { address, isConnected } = useAccount();
    const { addresses, eduIdentityAbi } = useContracts();
    const eduIdentityAddress = addresses.eduIdentity as `0x${string}`;

    //Only enable contract calls if we have valid address and contract address
    const canCallContract = isConnected && !!address && !!eduIdentityAddress;

    const { data: isStudent, isLoading: isStudentLoading } = useReadContract({
        address: eduIdentityAddress,
        abi: eduIdentityAbi,
        functionName: "isStudent",
        args: [address!],
        query: {
            enabled: canCallContract,
            refetchOnMount: true,
        },
    });

    const { data: studentProfile, isLoading: profileLoading } = useReadContract({
        address: eduIdentityAddress,
        abi: eduIdentityAbi,
        functionName: "getStudentProfile",
        args: [address!],
        query: {
            enabled: canCallContract && !!isStudent,
            refetchOnMount: true,
        },
    });

    const isLoading = isStudentLoading || profileLoading;

    const renderContent = () => {
        if (!isConnected) {
            return (
                <div className="text-center">
                    <p className="text-slate-400">Please connect your wallet to view your student profile.</p>
                    <Link to="/register">
                        <Button className="mt-4">Register / Connect</Button>
                    </Link>
                </div>
            );
        }
        if (isLoading) {
            return <p className="text-slate-400 text-center">Loading profile...</p>;
        }
        if (isStudent && studentProfile) {
            return (
                <div className="space-y-8">
                    <StudentProfile profile={studentProfile as any} />
                    <StudentConsents />
                    <AuditLog />
                </div>
            );
        }
        return (
            <div className="text-center">
                <p className="text-slate-400">This wallet is not registered as a student.</p>
                <Link to="/register">
                    <Button variant="outline" className="mt-4">Go to Registration</Button>
                </Link>
            </div>
        );
    };

    return (
        <main className="min-h-[calc(100vh-56px)] bg-slate-950 text-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
                <header className="space-y-2">
                    <h1 className="text-2xl font-semibold">Student Portal</h1>
                    <p className="text-slate-400 text-sm">
                        View your on-chain profile, manage consents, and audit data access.
                    </p>
                </header>
                {renderContent()}
            </div>
        </main>
    );
}
