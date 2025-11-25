import { useState, FormEvent } from "react";
import { useAccount, useReadContract } from "wagmi";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addresses } from "@/contracts/addresses";
import { eduConsentAbi } from "@/abi/eduConsent";

const DATA_OPTIONS = {
    "Basic Profile": 0,
    "Academic Record": 1,
    "Social Profile": 2,
};

export default function DataAccess() {
    const { address: requesterAddress } = useAccount();
    const [studentAddress, setStudentAddress] = useState("");
    const [dataType, setDataType] = useState(0);
    const [submitted, setSubmitted] = useState(false);

    const { data: hasConsent, refetch, isFetching } = useReadContract({
        address: addresses.eduConsent as `0x${string}`,
        abi: eduConsentAbi,
        functionName: "hasValidConsent",
        args: [studentAddress as `0x${string}`, requesterAddress!, dataType],
        query: {
            enabled: false,
        },
    });

    function handleCheckAccess(e: FormEvent) {
        e.preventDefault();
        if (!studentAddress || !requesterAddress) return;
        setSubmitted(true);
        refetch();
    }

    return (
        <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader>
                <CardTitle className="text-slate-50">Check Data Access</CardTitle>
                <CardDescription>
                    Verify if you have valid consent to access a student's data.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-4" onSubmit={handleCheckAccess}>
                    <div className="space-y-1">
                        <Label htmlFor="student-address">Student Address</Label>
                        <Input
                            id="student-address"
                            placeholder="0x..."
                            value={studentAddress}
                            onChange={(e) => setStudentAddress(e.target.value)}
                            className="font-mono"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label>Data Type</Label>
                        <Select onValueChange={(value) => setDataType(Number(value))} defaultValue={String(dataType)}>
                            <SelectTrigger className="w-full bg-slate-900 border-slate-700">
                                <SelectValue placeholder="Select a data type" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(DATA_OPTIONS).map(([name, value]) => (
                                    <SelectItem key={name} value={String(value)}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <CardFooter className="p-0 pt-4 flex justify-between items-center">
                        <Button type="submit" disabled={isFetching}>
                            {isFetching ? "Checking..." : "Check Access"}
                        </Button>
                        {submitted && !isFetching && (
                            <div className="text-sm">
                                {hasConsent ? (
                                    <span className="text-emerald-400 font-bold">Access Granted</span>
                                ) : (
                                    <span className="text-red-400 font-bold">Access Denied</span>
                                )}
                            </div>
                        )}
                    </CardFooter>
                </form>
            </CardContent>
        </Card>
    );
}