import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { eduIdentityAbi, CONTRACTS } from "@student-identity-platform/shared";

export default function RequesterRegisterForm() {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [appUri, setAppUri] = useState("");
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
            navigate("/requester");
        }, 2000);
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!address) {
            alert("Please connect your wallet.");
            return;
        }
        if (!name || !description || !appUri) {
            alert("Please fill in all fields.");
            return;
        }

        setIsSubmitting(true);
        setTxHash(null);

        try {
            const hash = await writeContractAsync({
                address: CONTRACTS.EduIdentity as `0x${string}`,
                abi: eduIdentityAbi,
                functionName: "registerRequester",
                args: [name, description, appUri],
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
                <CardTitle className="text-slate-50">Register as a Requester</CardTitle>
                <CardDescription className="text-slate-400">
                    Create an on-chain identity for your organization to request data from students.
                </CardDescription>
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
                    <p className="text-sm text-slate-200">
                        <strong>Note:</strong> You must use a different wallet address if you've already registered as a Student.
                        Each address can only have one role (Student OR Requester).
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        Current wallet: {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                </div>
            </CardHeader>

            <CardContent>
                <form className="grid gap-6" onSubmit={onSubmit}>
                    <div className="space-y-1">
                        <Label htmlFor="name" className="text-slate-200">Organization Name</Label>
                        <Input
                            id="name"
                            placeholder="Example University / Company"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-slate-900 border-slate-700 text-slate-50"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="description" className="text-slate-200">Description</Label>
                        <Input
                            id="description"
                            placeholder="Scholarship provider, internship platform…"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-slate-900 border-slate-700 text-slate-50"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="app-uri" className="text-slate-200">Website / App URL</Label>
                        <Input
                            id="app-uri"
                            placeholder="https://your-app.example"
                            value={appUri}
                            onChange={(e) => setAppUri(e.target.value)}
                            className="bg-slate-900 border-slate-700 text-slate-50"
                        />
                    </div>

                    <CardFooter className="p-0 pt-4">
                        <Button size="lg" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Check Wallet..." : isConfirming ? "Confirming..." : "Register Requester"}
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
