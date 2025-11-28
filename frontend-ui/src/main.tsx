import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Web3Provider } from "./lib/wallet";
import { AuthProvider } from "./lib/auth";
import { ContractsProvider } from "./lib/contractsContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
     <React.StrictMode>
        <Web3Provider>
            <ContractsProvider>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </ContractsProvider>
        </Web3Provider>
    // </React.StrictMode>
);
