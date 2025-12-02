import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toHex } from "viem/utils";
import { eduIdentityAbi, CONTRACTS } from "@student-identity-platform/shared";
import { api } from "@/lib/api";

export default function StudentRegisterForm() {
    const [handle, setHandle] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [university, setUniversity] = useState("");
    const [enrollmentYear, setEnrollmentYear] = useState("");
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);

    const { address } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash as `0x${string}`,
    });
    const navigate = useNavigate();

    if (isConfirmed) {
        setTimeout(() => {
            navigate("/student");
        }, 2000);
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!address) {
            alert("Please connect your wallet.");
            return;
        }
        if (!handle || !displayName || !university || !enrollmentYear || !email) {
            alert("Please fill in all fields.");
            return;
        }

        setIsSubmitting(true);
        setTxHash(null);

        try {
            const emailHash = keccak256(toHex(email));

            let profileCid = "";
            try {
                const walletRes = await api.registerWallet(address, displayName);
                profileCid = walletRes.cid;
            } catch (apiErr) {
                console.error("Backend registration failed:", apiErr);
                profileCid = `bafy${Math.random().toString(36).substring(2)}`;
                alert("Warning: Backend registration failed. Your profile data may not be viewable.");
            }

            const hash = await writeContractAsync({
                address: CONTRACTS.EduIdentity as `0x${string}`,
                abi: eduIdentityAbi,
                functionName: "registerStudent",
                args: [
                    handle,
                    displayName,
                    university,
                    parseInt(enrollmentYear),
                    emailHash,
                    profileCid
                ],
            });

            setTxHash(hash);

            setTxHash(hash);
        } catch (error: any) {
            console.error("Registration failed:", error);
            alert(`Registration failed: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader>
                <CardTitle className="text-slate-50">Create your EduChain ID</CardTitle>
                <CardDescription>
                    This will create your on-chain identity on the EduChain network.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form className="grid gap-6" onSubmit={onSubmit}>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-slate-200">Handle</Label>
                            <Input className="bg-slate-900 border-slate-700 text-slate-50" value={handle} onChange={(e) => setHandle(e.target.value)} />
                        </div>

                        <div>
                            <Label className="text-slate-200">Display name</Label>
                            <Input className="bg-slate-900 border-slate-700 text-slate-50" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <Label className="text-slate-200">University</Label>
                        <Input className="bg-slate-900 border-slate-700 text-slate-50" value={university} onChange={(e) => setUniversity(e.target.value)} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-slate-200">Enrollment year</Label>
                            <Input className="bg-slate-900 border-slate-700 text-slate-50" type="number" value={enrollmentYear} onChange={(e) => setEnrollmentYear(e.target.value)} />
                        </div>

                        <div>
                            <Label className="text-slate-200">Student email</Label>
                            <Input className="bg-slate-900 border-slate-700 text-slate-50" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                    </div>

                    <CardFooter className="p-0 pt-4">
                        <Button size="lg" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Check Wallet..." : isConfirming ? "Confirming..." : "Register"}
                        </Button>
                    </CardFooter>

                    {txHash && (
                        <div className="text-xs text-slate-400 break-all">
                            Transaction: {txHash}
                            <br />
                            {isConfirming && <span className="text-yellow-400">Waiting for confirmation...</span>}
                            {isConfirmed && <span className="text-emerald-400">Confirmed! Redirecting...</span>}
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
