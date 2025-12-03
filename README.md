# EduChain: A Decentralized Student Identity Platform

> A proof-of-concept decentralized application that empowers students to control their own academic data using blockchain technology for identity and consent management, with sensitive data stored securely off-chain.

---

## Table of Contents

- [About The Project](#about-the-project)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Running the Application](#running-the-application)
- [Usage and Testing Guide](#usage-and-testing-guide)
  - [1. One-Time MetaMask Setup](#1-one-time-metamask-setup)
  - [2. Testing the Full Application Flow](#2-testing-the-full-application-flow)
- [Project Structure](#project-structure)

## About The Project

EduChain tackles the challenge of data privacy in education. In traditional systems, student data (grades, transcripts, etc.) is held by institutions, giving students little control. This project demonstrates a new paradigm where:

-   **Identity is On-Chain:** Students and data requesters (e.g., universities, employers) register their identity on a blockchain.
-   **Consent is King:** Students have granular control and can grant or revoke access to specific types of their data to specific requesters for a limited time. All consent agreements are managed by a smart contract.
-   **Data is Off-Chain:** Sensitive personal data is stored in a secure off-chain database. The blockchain only stores a pointer (`cid`) to this data.
-   **Auditability:** Every single attempt to access data, whether successful or denied, is logged as an immutable event on the blockchain, creating a transparent audit trail.

## Architecture Overview

The system uses a hybrid on-chain/off-chain model to ensure both security and privacy.

1.  **Frontend (React):** The user interface that allows students and requesters to interact with the system.
2.  **Smart Contracts (Solidity/Hardhat):** The on-chain "gatekeeper." They manage user identities (`EduIdentity`) and consent agreements (`EduConsent`). They do **not** store any sensitive data.
3.  **Backend API (Node.js/Express):** A secure intermediary that sits between the frontend and the database.
4.  **Database (PostgreSQL):** The off-chain "vault" that stores sensitive student data like grades and certificates, linked by a unique `cid`.

## Getting Started

Follow these steps to get a local copy of the project up and running.

### Prerequisites

You must have the following software installed on your machine:

-   **Node.js:** (v18 or later recommended) - [Download Node.js](https://nodejs.org/)
-   **Docker Desktop:** The engine for running the application's services. - [Download Docker](https://www.docker.com/products/docker-desktop/)
-   **Git:** For cloning the repository. - [Install Git](https://git-scm.com/downloads)
-   **MetaMask:** Browser extension wallet for interacting with the application. - [Install MetaMask](https://metamask.io/download/)
-   **(Apple Silicon Macs Only) Rosetta 2:** Required for Docker to run the Intel-based database image.
    ```sh
    softwareupdate --install-rosetta
    ```

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/WhitehatD/Student-Identity-Consent.git
    cd Student-Identity-Consent
    ```

2.  **Install all dependencies:**
    This project contains multiple `package.json` files. You need to install dependencies for the root, backend, and frontend.
    ```sh
    # 1. Install root (Hardhat) dependencies
    npm install

    # 2. Install backend dependencies
    cd backend
    npm install
    cd ..

    # 3. Install frontend dependencies
    cd frontend-ui
    npm install
    cd ..
    ```

## Running the Application

From the root directory of the project, use Docker Compose to build and start all services. This single command starts the Hardhat blockchain, the PostgreSQL database, the backend API, and the frontend server.

```sh
docker-compose up --build
```

Wait for the logs from all services to settle. Once running, the frontend will be accessible at **`http://localhost:5173`**.

## Usage and Testing Guide

### 1. One-Time MetaMask Setup

Before you can use the application, you need to configure your MetaMask wallet to connect to the local Hardhat blockchain and get some test funds.

#### Add the Hardhat Network

1.  Open your MetaMask extension and click on the network dropdown.
2.  Select "Add network" -> "Add a network manually".
3.  Enter the following details:
    -   **Network Name:** `Hardhat Local`
    -   **New RPC URL:** `http://localhost:8545`
    -   **Chain ID:** `31337`
    -   **Currency Symbol:** `ETH`
4.  Save the network and make sure it is selected.

#### Fund Your MetaMask Wallet

Your new account needs test Ether to pay for gas fees. We have a script for that.

1.  In MetaMask, click on your account name to copy your wallet address (it starts with `0x...`).
2.  Open the file `scripts/fund-wallets.ts` in your code editor.
3.  **Replace the placeholder address** inside the `walletsToFund` array with the address you just copied from MetaMask.
    ```javascript
    const walletsToFund = [
      "YOUR_METAMASK_WALLET_ADDRESS_HERE", 
    ];
    ```
4.  Open a **new terminal window** (do not close your `docker-compose` window) and run the funding script:
    ```sh
    npx hardhat run scripts/fund-wallets.ts
    ```
5.  Your MetaMask wallet should now have 100 ETH.

### 2. Testing the Full Application Flow

Now you can test the application. For the best experience, use two different browsers (or a normal and an incognito window) to simulate a Student and a Requester.

1.  **Access the Application:**
    -   Go to **`http://localhost:5173`** in both browsers.

2.  **Register Users:**
    -   In **Browser 1 (Student)**, click "Connect Wallet", approve the connection in MetaMask, and then register as a new Student.
    -   In **Browser 2 (Requester)**, do the same, but register as a new Requester.

3.  **Grant Consent:**
    -   In **Browser 1**, navigate to the "My Student Profile" page.
    -   Copy the wallet address of the Requester from **Browser 2** (you can find it on the Search page).
    -   In the "Share Your Data" form, paste the Requester's address and grant consent for the "Academic Record" data type.

4.  **Access Data:**
    -   In **Browser 2**, navigate to the Search page and click "View Profile" for the Student.
    -   You should now see the Student's on-chain profile **and** a new section displaying their off-chain grades and certificates from the database.

5.  **Revoke Consent:**
    -   In **Browser 1**, go back to your profile and click the "Revoke" button for the consent you just granted.
    -   In **Browser 2**, refresh the Student's profile page. The off-chain data section should now be gone.

## Project Structure

-   `/contracts`: Contains the Solidity smart contracts (`EduIdentity`, `EduConsent`, `EduToken`).
-   `/frontend-ui`: The React frontend application built with Vite.
-   `/backend`: The Node.js/Express backend API server that connects to the database.
-   `/scripts`: Contains helper scripts for deployment, testing, and funding.
-   `/shared`: A critical directory that shares contract ABIs and addresses between the frontend and backend.
-   `docker-compose.yml`: The main file for orchestrating all the application's services.
-   `consentDatabase.sql`: The SQL script that initializes the PostgreSQL database schema and mock data.
