import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { getAddress } from "viem";
import { eduConsentAbi, CONTRACTS } from "@student-identity-platform/shared";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";

const DATA_OPTIONS = {
    "Basic Profile": 0,
    "Academic Record": 1,
    "Social Profile": 2,
};
const DATA_OPTIONS_REVERSE = ["Basic Profile", "Academic Record", "Social Profile"];

type ConsentRow = {
    id: string;
    requester: string;
    dataType: number;
    status: "active" | "revoked";
    expiresAt: string;
};

export default function StudentConsents() {
    const { address } = useAccount();
    const { writeContractAsync } = useWriteContract();

    const [requesterAddress, setRequesterAddress] = useState("");
    const [selectedData, setSelectedData] = useState<number[]>([0]);
    const [duration, setDuration] = useState(30);
    const [consents, setConsents] = useState<ConsentRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchLogs = async () => {
        if (!address) return;
        setIsLoading(true);
        try {
            const data = await api.getStudentConsents(address);
            setConsents(data.consents);
        } catch (error) {
            console.error("Error fetching consents:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [address]);

    function toggleDataType(option: number) {
        setSelectedData((prev) =>
            prev.includes(option)
                ? prev.filter((d) => d !== option)
                : [...prev, option]
        );
    }

    async function handleGrant(e: FormEvent) {
        e.preventDefault();
        if (!address) return;

        const requesters = requesterAddress
            .split(",")
            .map(addr => addr.trim())
            .filter(addr => addr.startsWith("0x"))
            .map(addr => getAddress(addr)); // Checksum the address

        if (requesters.length === 0 || selectedData.length === 0 || !duration) return;

        setIsSubmitting(true);
        try {
            for (const req of requesters) {
                for (const dt of selectedData) {
                    await writeContractAsync({
                        address: CONTRACTS.EduConsent as `0x${string}`,
                        abi: eduConsentAbi,
                        functionName: "setConsent",
                        args: [req as `0x${string}`, dt, duration],
                    });
                }
            }
            await fetchLogs();
            setRequesterAddress("");
            setSelectedData([0]);
        } catch (error: any) {
            console.error("Error granting consent:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleRevoke(requester: string, dataType: number) {
        if (!address) return;
        if (!confirm("Are you sure you want to revoke this consent?")) return;

        setIsSubmitting(true);
        try {
            await writeContractAsync({
                address: CONTRACTS.EduConsent as `0x${string}`,
                abi: eduConsentAbi,
                functionName: "revokeConsent",
                args: [requester as `0x${string}`, dataType],
            });
            await fetchLogs();
        } catch (error: any) {
            console.error("Error revoking consent:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-6">
            <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-slate-50">Share Your Data</CardTitle>
                    <CardDescription>
                        Give organizations permission to see specific parts of your profile.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleGrant} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="requester-address">Requester Addresses (comma separated)</Label>
                            <Input
                                id="requester-address"
                                value={requesterAddress}
                                onChange={(e) => setRequesterAddress(e.target.value)}
                                placeholder="0x..., 0x..."
                                className="bg-slate-900 border-slate-700 text-slate-50 font-mono"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>Data Types</Label>
                                <div className="flex flex-wrap gap-3 text-sm">
                                    {Object.entries(DATA_OPTIONS).map(([name, value]) => (
                                        <label
                                            key={name}
                                            className="inline-flex items-center gap-2 rounded-full bg-slate-900 border border-slate-700 px-3 py-1 cursor-pointer select-none"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedData.includes(value)}
                                                onChange={() => toggleDataType(value)}
                                                className="h-3 w-3 rounded border-slate-500 bg-slate-900"
                                            />
                                            <span>{name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration">Duration (days)</Label>
                                <Input
                                    id="duration"
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value))}
                                    min="1"
                                    max="365"
                                    className="bg-slate-900 border-slate-700 text-slate-50"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="px-6" disabled={isSubmitting}>
                            {isSubmitting ? "Granting..." : "Grant Consent"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-slate-50">Your Consents</CardTitle>
                    <CardDescription>
                        An overview of who has access to your data.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-sm text-slate-400">Loading consents...</p>
                    ) : consents.length === 0 ? (
                        <p className="text-sm text-slate-400">
                            You haven't granted access to anyone yet.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Requester</TableHead>
                                    <TableHead>Data Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {consents.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-mono text-xs">{row.requester}</TableCell>
                                        <TableCell className="text-sm">
                                            {DATA_OPTIONS_REVERSE[row.dataType]}
                                        </TableCell>
                                        <TableCell>
                                            <span className={row.status === "active" ? "text-emerald-400" : "text-slate-500"}>
                                                {row.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {new Date(Number(row.expiresAt) * 1000).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {row.status === "active" && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-slate-700 text-slate-200 hover:bg-slate-800"
                                                    onClick={() => handleRevoke(row.requester, row.dataType)}
                                                    disabled={isSubmitting}
                                                >
                                                    Revoke
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
