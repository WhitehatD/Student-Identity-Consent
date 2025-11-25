import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { useWriteContract } from "wagmi";
import { addresses } from "../contracts/addresses";
import { eduIdentityAbi } from "@/abi/eduIdentity";

export default function RequesterRegisterForm() {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [appUri, setAppUri] = useState("");

    const { data: hash, isPending, writeContract } = useWriteContract();

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name || !description || !appUri) {
            alert("Please fill in all fields.");
            return;
        }

        writeContract({
            address: addresses.eduIdentity as `0x${string}`,
            abi: eduIdentityAbi,
            functionName: 'registerRequester',
            args: [name, description, appUri],
        });
    }

    return (
        <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader>
                <CardTitle className="text-slate-50">Register as a Requester</CardTitle>
                <CardDescription>
                    Create an on-chain identity for your organization to request data from students.
                </CardDescription>
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
                        <Button size="lg" type="submit" disabled={isPending}>
                            {isPending ? "Confirming..." : "Register Requester"}
                        </Button>
                    </CardFooter>

                    {hash && <div>Transaction Hash: {hash}</div>}
                </form>
            </CardContent>
        </Card>
    );
}