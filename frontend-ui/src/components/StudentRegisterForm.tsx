import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toHex } from "viem/utils";
import { useContracts } from "@/lib/contractsContext";

export default function StudentRegisterForm() {
    const [handle, setHandle] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [university, setUniversity] = useState("");
    const [enrollmentYear, setEnrollmentYear] = useState("");
    const [email, setEmail] = useState("");
    const navigate = useNavigate();

    const { data: hash, isPending, writeContract } = useWriteContract();
    const { addresses, eduIdentityAbi } = useContracts();
    const contractAddress = addresses.eduIdentity as `0x${string}`;

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    // Navigate to student page after successful registration
    if (isConfirmed && hash) {
        setTimeout(() => {
            navigate("/student");
        }, 500);
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!handle || !displayName || !university || !enrollmentYear || !email) {
            alert("Please fill in all fields.");
            return;
        }

        const emailHash = keccak256(toHex(email));

        writeContract({
            address: contractAddress,
            abi: eduIdentityAbi,
            functionName: 'registerStudent',
            args: [handle, displayName, university, parseInt(enrollmentYear), emailHash, ""],
        });
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
                        <Button size="lg" type="submit" disabled={isPending || isConfirming}>
                            {isPending ? "Waiting for signature..." : isConfirming ? "Confirming transaction..." : isConfirmed ? "Success! Redirecting..." : "Register"}
                        </Button>
                    </CardFooter>

                    {hash && (
                        <div className="text-xs text-slate-400 break-all">
                            Transaction: {hash}
                            {isConfirming && " (confirming...)"}
                            {isConfirmed && " ✓ Confirmed!"}
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
