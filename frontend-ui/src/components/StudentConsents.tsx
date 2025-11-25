import { useState, FormEvent, useEffect } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
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
import { addresses } from "@/contracts/addresses";
import { eduConsentAbi } from "@/abi/eduConsent";
import { parseAbiItem } from "viem";

const DATA_OPTIONS = {
    "Basic Profile": 0,
    "Academic Record": 1,
    "Social Profile": 2,
};
const DATA_OPTIONS_REVERSE = ["Basic Profile", "Academic Record", "Social Profile"];

type ConsentRow = {
    id: string;
    requester: `0x${string}`;
    dataType: number;
    status: "active" | "revoked";
    expiresAt: bigint;
};

export default function StudentConsents() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { writeContract, isPending } = useWriteContract();

    const [requesterAddress, setRequesterAddress] = useState("");
    const [selectedData, setSelectedData] = useState<number[]>([0]);
    const [duration, setDuration] = useState(30);
    const [consents, setConsents] = useState<Map<string, ConsentRow>>(new Map());

    useEffect(() => {
        if (!address || !publicClient) return;

        const fetchLogs = async () => {
            const newConsents = new Map<string, ConsentRow>();

            const grantLogs = await publicClient.getLogs({
                address: addresses.eduConsent as `0x${string}`,
                event: parseAbiItem('event ConsentGranted(address indexed owner, address indexed requester, uint8 indexed dataType, uint64 expiresAt)'),
                args: { owner: address },
                fromBlock: 0n,
                toBlock: 'latest'
            });

            for (const log of grantLogs) {
                const { requester, dataType, expiresAt } = log.args;
                const id = `${requester}-${dataType}`;
                newConsents.set(id, { id, requester: requester!, dataType: dataType!, expiresAt: expiresAt!, status: 'active' });
            }

            const revokeLogs = await publicClient.getLogs({
                address: addresses.eduConsent as `0x${string}`,
                event: parseAbiItem('event ConsentRevoked(address indexed owner, address indexed requester, uint8 dataType)'),
                args: { owner: address },
                fromBlock: 0n,
                toBlock: 'latest'
            });

            for (const log of revokeLogs) {
                const { requester, dataType } = log.args;
                const id = `${requester}-${dataType}`;
                if (newConsents.has(id)) {
                    newConsents.get(id)!.status = 'revoked';
                }
            }
            
            setConsents(newConsents);
        };

        fetchLogs();
    }, [address, publicClient]);

    function toggleDataType(option: number) {
        setSelectedData((prev) =>
            prev.includes(option)
                ? prev.filter((d) => d !== option)
                : [...prev, option]
        );
    }

    function handleGrant(e: FormEvent) {
        e.preventDefault();
        const requesters = requesterAddress.split(",").map(addr => addr.trim()).filter(addr => addr.startsWith("0x"));
        if (requesters.length === 0 || selectedData.length === 0 || !duration) return;

        const durations = Array(requesters.length * selectedData.length).fill(duration);
        const finalRequesters = requesters.flatMap(req => selectedData.map(() => req as `0x${string}`));
        const finalDataTypes = requesters.flatMap(() => selectedData);

        writeContract({
            address: addresses.eduConsent as `0x${string}`,
            abi: eduConsentAbi,
            functionName: "setConsentBatch",
            args: [finalRequesters, finalDataTypes, durations],
        });
    }

    function handleRevoke(requester: `0x${string}`, dataType: number) {
        writeContract({
            address: addresses.eduConsent as `0x${string}`,
            abi: eduConsentAbi,
            functionName: "revokeConsent",
            args: [requester, dataType],
        });
    }

    const consentList = Array.from(consents.values());

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

                        <Button type="submit" className="px-6" disabled={isPending}>
                            {isPending ? "Granting..." : "Grant Consent"}
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
                    {consentList.length === 0 ? (
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
                                {consentList.map((row) => (
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
                                                    disabled={isPending}
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