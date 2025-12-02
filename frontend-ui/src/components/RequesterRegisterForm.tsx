import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useContracts } from "@/lib/contractsContext";

export default function RequesterRegisterForm() {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [appUri, setAppUri] = useState("");
    const { address } = useAccount();
    const navigate = useNavigate();

    const { data: hash, isPending, writeContract } = useWriteContract();
    const { addresses, eduIdentityAbi } = useContracts();
    const contractAddress = addresses.eduIdentity as `0x${string}`;

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    if (isConfirmed && hash) {
        setTimeout(() => {
            navigate("/requester");
        }, 500);
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name || !description || !appUri) {
            alert("Please fill in all fields.");
            return;
        }
        writeContract({
            address: contractAddress,
            abi: eduIdentityAbi,
            functionName: 'registerRequester',
            args: [name, description, appUri],
        });
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
                        <Button size="lg" type="submit" disabled={isPending || isConfirming}>
                            {isPending ? "Waiting for signature..." : isConfirming ? "Confirming transaction..." : isConfirmed ? "Success! Redirecting..." : "Register Requester"}
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
