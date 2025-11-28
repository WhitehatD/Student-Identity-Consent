import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type User = {
    id: string;
    handle: string;
};

type AuthContextValue = {
    user: User | null;
    loginDemo: () => void;
    logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    const loginDemo = () =>
        setUser({
            id: "demo-account-1",
            handle: "@demoStudent",
        });

    const logout = () => setUser(null);

    return (
        <AuthContext.Provider value={{ user, loginDemo, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}