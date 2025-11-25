// src/pages/RegisterPage.tsx
import { useState } from "react";
import StudentRegisterForm from "@/components/StudentRegisterForm";
import RequesterRegisterForm from "@/components/RequesterRegisterForm";
import { Button } from "@/components/ui/button";

type Role = "student" | "requester";

export default function RegisterPage() {
    const [selectedRole, setSelectedRole] = useState<Role>("student");

    return (
        <main className="min-h-[calc(100vh-56px)] bg-slate-950 text-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
                <header className="space-y-2 text-center">
                    <h1 className="text-3xl font-semibold">Join EduChain</h1>
                    <p className="text-slate-400">
                        Create your on-chain identity to get started.
                    </p>
                </header>

                <div className="flex justify-center gap-2 p-1 bg-slate-900/60 border border-slate-800 rounded-lg max-w-sm mx-auto">
                    <Button
                        variant={selectedRole === "student" ? "secondary" : "ghost"}
                        onClick={() => setSelectedRole("student")}
                        className="flex-1"
                    >
                        I am a Student
                    </Button>
                    <Button
                        variant={selectedRole === "requester" ? "secondary" : "ghost"}
                        onClick={() => setSelectedRole("requester")}
                        className="flex-1"
                    >
                        I am a Requester
                    </Button>
                </div>

                <div className="max-w-2xl mx-auto">
                    {selectedRole === "student" ? (
                        <StudentRegisterForm />
                    ) : (
                        <RequesterRegisterForm />
                    )}
                </div>
            </div>
        </main>
    );
}