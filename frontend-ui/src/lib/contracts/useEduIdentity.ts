import { useReadContract } from "wagmi";
import { useContracts } from "@/lib/contractsContext";

export function useIsStudent(address?: `0x${string}`) {
    const { addresses, eduIdentityAbi } = useContracts();
    const eduIdentityAddress = addresses.eduIdentity as `0x${string}`;

    return useReadContract({
        abi: eduIdentityAbi,
        address: eduIdentityAddress,
        functionName: "isStudent",
        args: address ? [address] : undefined,
        query: {
            enabled: !!address,
        },
    });
}
