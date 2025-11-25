// src/lib/contracts/useEduIdentity.ts
import { useReadContract } from "wagmi";
import { eduIdentityAbi } from "@/abi/eduIdentity";
import { addresses } from "@/contracts/addresses";

// adjust this name if your addresses.ts exports differently
const EDU_IDENTITY_ADDRESS = addresses.eduIdentity as `0x${string}`;

export function useIsStudent(address?: `0x${string}`) {
    return useReadContract({
        abi: eduIdentityAbi,
        address: EDU_IDENTITY_ADDRESS,
        functionName: "isStudent",
        // only pass args when we actually have an address
        args: address ? [address] : undefined,
        query: {
            enabled: !!address, // don't spam RPC if no address yet
        },
    });
}