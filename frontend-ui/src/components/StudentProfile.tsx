import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Label } from "./ui/label";

type StudentProfileData = {
    registered: boolean;
    handle: string;
    displayName: string;
    university: string;
    enrollmentYear: bigint;
    emailHash: string;
    profileCid: string;
};

export default function StudentProfile({ profile }: { profile: StudentProfileData }) {
    return (
        <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader>
                <CardTitle className="text-slate-50">Your Profile</CardTitle>
                <CardDescription>
                    This is your on-chain identity.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Handle</Label>
                        <p className="text-lg font-mono text-emerald-400">@{profile.handle}</p>
                    </div>
                    <div>
                        <Label>Display Name</Label>
                        <p className="text-lg">{profile.displayName}</p>
                    </div>
                </div>
                <div>
                    <Label>University</Label>
                    <p className="text-lg">{profile.university}</p>
                </div>
                <div>
                    <Label>Enrollment Year</Label>
                    <p className="text-lg">{profile.enrollmentYear.toString()}</p>
                </div>
                <div>
                    <Label>Profile CID</Label>
                    <p className="text-sm font-mono text-slate-400">{profile.profileCid || "Not set"}</p>
                </div>
            </CardContent>
        </Card>
    );
}