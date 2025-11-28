import { useState, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { parseAbiItem } from "viem";
import { useContracts } from "@/lib/contractsContext";

const DATA_OPTIONS_REVERSE = ["Basic Profile", "Academic Record", "Social Profile"];

type LogRow = {
    id: string;
    requester: `0x${string}`;
    dataType: number;
    timestamp: bigint;
    granted: boolean;
};

export default function AuditLog() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { addresses } = useContracts();
    const consentAddress = addresses.eduConsent as `0x${string}`;
    const [logs, setLogs] = useState<LogRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!address || !publicClient) return;

        const fetchLogs = async () => {
            setIsLoading(true);
            const accessLogs: LogRow[] = [];

            const fetchedLogs = await publicClient.getLogs({
                address: consentAddress,
                event: parseAbiItem('event AccessAttempt(address indexed owner, address indexed requester, uint8 indexed dataType, uint64 timestamp, bool granted)'),
                args: { owner: address },
                fromBlock: 0n,
                toBlock: 'latest'
            });

            for (const log of fetchedLogs) {
                const { requester, dataType, timestamp, granted } = log.args;
                accessLogs.push({
                    id: `${log.transactionHash}-${log.logIndex}`,
                    requester: requester!,
                    dataType: dataType!,
                    timestamp: timestamp!,
                    granted: granted!,
                });
            }

            accessLogs.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

            setLogs(accessLogs);
            setIsLoading(false);
        };

        fetchLogs();
    }, [address, publicClient]);

    return (
        <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader>
                <CardTitle className="text-slate-50">Access Log</CardTitle>
                <CardDescription>
                    A complete audit trail of all access attempts for your data.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p className="text-sm text-slate-400">Loading access history...</p>
                ) : logs.length === 0 ? (
                    <p className="text-sm text-slate-400">
                        No data access attempts have been made yet.
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Requester</TableHead>
                                <TableHead>Data Type</TableHead>
                                <TableHead>Timestamp</TableHead>
                                <TableHead className="text-right">Outcome</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-xs">{log.requester}</TableCell>
                                    <TableCell className="text-sm">
                                        {DATA_OPTIONS_REVERSE[log.dataType]}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {new Date(Number(log.timestamp) * 1000).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={log.granted ? "text-emerald-400" : "text-red-400"}>
                                            {log.granted ? "Granted" : "Denied"}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
