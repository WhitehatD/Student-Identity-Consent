import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function Home() {
    return (
        <main className="min-h-[calc(100vh-56px)] bg-slate-950 text-slate-50">
            <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 md:py-16">
                <section className="space-y-4">
                    <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">
                        BlockChains group 4
                    </p>
                    <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                        Own your student data.
                        <span className="block text-emerald-400">
              Share it only with explicit consent.
            </span>
                    </h1>
                    <p className="max-w-2xl text-slate-400">
                        This App is a demo for a privacy-preserving education data platform.
                        Students control their profile, and organisations request access
                        on-chain using consent smart contracts.
                    </p>

                    <div className="flex flex-wrap gap-3 pt-2">
                        <Link to="/student">
                            <Button size="lg" className="px-8">
                                Go to student portal
                            </Button>
                        </Link>

                        <Link to="/requester">
                            <Button
                                size="lg"
                                variant="outline"
                                className="px-8 bg-white text-gray-800 hover:bg-gray-100"
                            >
                                View requester side
                            </Button>
                        </Link>
                    </div>
                </section>

                <section className="grid gap-6 md:grid-cols-2">
                    <Card className="bg-slate-900/60 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-slate-50">For students</CardTitle>
                            <CardDescription>
                                Create an identity, manage your profile, and see who has consent
                                to access what.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-300">
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Register once with your wallet.</li>
                                <li>Update profile info stored off-chain (IPFS / DB).</li>
                                <li>Grant or revoke consent for specific data types.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/60 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-slate-50">For Requesters</CardTitle>
                            <CardDescription>
                                Universities or companies request access to student data with
                                auditable on-chain logs.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-slate-300">
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Register your organisation and describe your use case.</li>
                                <li>Request access to specific data types.</li>
                                <li>Respect expiry dates and handle revocations.</li>
                            </ul>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </main>
    );
}