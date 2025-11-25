import { useReadContract } from "wagmi";
import { eduIdentityAbi } from "@/abi/eduIdentity";
import { addresses } from "@/contracts/addresses";

const EDU_IDENTITY_ADDRESS = addresses.eduIdentity as `0x${string}`;

export function useIsStudent(address?: `0x${string}`) {
    return useReadContract({
        abi: eduIdentityAbi,
        address: EDU_IDENTITY_ADDRESS,
        functionName: "isStudent",
        args: address ? [address] : undefined,
        query: {
            enabled: !!address,
        },
    });
}