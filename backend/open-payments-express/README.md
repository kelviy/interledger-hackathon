# Open Payments Express App

A lightweight application to show the Open Payments API functions.

## Requirements

Before you begin, you need to install the following tools:

- [Visual Studio Code](https://code.visualstudio.com/)
- [Node (>= v18.18)](https://nodejs.org/en/download/)
- [Git](https://git-scm.com/downloads)

## Quick Start

### 1. Clone the repository

Open `Visual Studio Code` and open a `terminal` in your Visual Studio Code. Then run this command below:

```bash
git clone https://github.com/FinHubSA/open-payments-express.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup `.env` file

- Follow this tutorial to setup your [test wallet](https://openpayments.dev/sdk/before-you-begin/)
- Create a new `.env` file, right next to the `.env.example` and copy all code from `.env.example` to `.env`.
- Copy key ID and the wallet address into the `.env` file.
- Put the private key in the root folder i.e. open-payments-express/private.key.
  > Note: The private key file was saved and generated automatically when you created `Developer Keys` for your wallet address.

### 4. Start the Server

```bash
# Development mode with auto-restart
npm run dev
```

The server will start on `http://localhost:3001`
