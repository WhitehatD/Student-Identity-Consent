// src/lib/auth.tsx
import { createContext, useContext, useState, ReactNode } from "react";

type User = {
    id: string;      // later: your chain account ID
    handle: string;  // e.g. @kirsten
};

type AuthContextValue = {
    user: User | null;
    loginDemo: () => void;
    logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    // TEMP: fake login. Later you plug in your own blockchain login here.
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