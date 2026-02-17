# ⛓️ Blockchain Mining Simulator

An interactive, browser-based blockchain simulator that visualizes how blockchains work — from creating transactions and building Merkle trees to competitive proof-of-work mining with Web Workers. No servers, no frameworks — just pure HTML, CSS, and JavaScript.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Proof-of-Work Mining Race** | Multiple miners compete simultaneously using real Web Workers (parallel CPU threads), each independently searching for a valid nonce |
| **Transaction System** | Create transactions between network participants with real-time balance validation and insufficient-funds protection |
| **Merkle Tree** | All transactions in a block are hashed into a binary Merkle tree; the root is stored in the block header for integrity verification |
| **Chain Validation** | One-click validation checks every block's hash, previous-hash linkage, Merkle root, and proof-of-work target |
| **Tamper Detection** | Modify any block's transaction amount or timestamp, then validate — the chain visually highlights the corrupted block and all blocks after it |
| **Block Explorer** | Click any block card to open a detailed modal showing block index, miner, nonce, timestamp, previous hash, Merkle root, block hash, and all transactions |
| **Adjustable Difficulty** | Change the number of leading zeros (1–6) required in the block hash to see how difficulty affects mining time |
| **Live Mining Dashboard** | Real-time display of each miner's hash attempts, racing animations, and a timer during the mining process |
| **Dark / Light Theme** | Switchable dark and light themes with preference saved to localStorage |

---

## 🚀 Getting Started

No build tools, package managers, or dependencies required — just open the HTML file!

1. **Clone the repository**
   ```bash
   git clone https://github.com/AabhishekPatel9/blockchain-mining-simulator.git
   cd blockchain-mining-simulator
   ```

2. **Open in your browser**
   - Simply double-click `index.html`, or
   - Use a local server for the best experience:
     ```bash
     npx serve .
     ```

> **Note:** Web Workers require a HTTP context in some browsers, so using `npx serve` is recommended if you encounter issues with `file://`.

---

## 🎮 How to Use

1. **Add Transactions** — Select a sender and receiver from the dropdown (6 network participants), enter an amount, and click *Add Transaction*. The system checks balances in real-time.
2. **Start Mining** — Choose how many competing miners (2–6), then click *Start Mining Race*. Random participants from the network are selected to race.
3. **Watch the Race** — The mining panel shows each miner's hash attempts in real-time with pulse animations. The first to find a valid hash wins.
4. **Explore Blocks** — Click any block card in the chain to view full details: hashes, nonce, Merkle root, miner, timestamp, and every transaction.
5. **Tamper with Data** — Inside a block's detail modal, click the 🔧 *Tamper* button on any transaction to change its amount, or ✏️ to change the timestamp.
6. **Validate the Chain** — Click *✓ Validate* in the settings panel. Tampered blocks turn red with a pulsing animation, and all subsequent blocks show as broken (chain linkage invalidated).
7. **Adjust Difficulty** — Change the POW difficulty (1–6 leading zeros). Higher difficulty = exponentially longer mining times.
8. **Switch Theme** — Click the 🌙/☀️ button in the header to toggle between dark and light themes. Your preference is saved automatically.

---

## 🔬 Blockchain Concepts Explained

### SHA-256 Hash Function
The simulator uses a custom, high-performance hash function inspired by SHA-256. It takes any string input and produces a **64-character hexadecimal** (256-bit) output. The function uses:
- **Four 32-bit state variables** initialized with the first fractional digits of primes
- **Bit manipulation** — XOR (`^`), multiplication (`Math.imul`), and bitwise rotations
- **Avalanche mixing** — after processing all input characters, a finalization step mixes the state variables to ensure even a 1-bit change in input completely changes the output

### Proof-of-Work (PoW)
Mining requires finding a **nonce** (number) that, when combined with the block data and hashed, produces a hash **starting with N zeros** (where N = difficulty). Since hashes are essentially random, the only way to find one is brute-force — try millions of nonces until one works. This is what makes mining computationally expensive and is the core security mechanism of Bitcoin.

### Merkle Tree
Instead of storing all transactions directly in the block header, the simulator builds a **binary Merkle tree**:
1. Hash each transaction individually → leaf nodes
2. Pair adjacent hashes and hash them together → parent nodes
3. If there's an odd number, duplicate the last hash
4. Repeat until one root hash remains — the **Merkle Root**

This allows efficient verification: changing any single transaction changes the Merkle root, instantly proving tampering.

### Nonce
A nonce is a "number used once" — the variable that miners increment during mining. The block data stays fixed; only the nonce changes. Each nonce produces a completely different hash due to the avalanche effect. The winning nonce is the one that produces a hash meeting the difficulty target.

### Chain Validation
The blockchain validates its integrity by checking **five things** for every block:
1. **Hash Recalculation** — Recalculate the block hash from its data and compare to the stored hash (detects data tampering)
2. **Previous Hash Link** — Verify `block.previousHash === previousBlock.hash` (ensures chain continuity)
3. **Merkle Root** — Recalculate the Merkle root from transactions and compare (detects transaction tampering)
4. **Proof-of-Work** — Verify the hash starts with the required number of zeros (ensures the block was properly mined)
5. **State Validation** — Re-runs every transaction from the Genesis block to ensure no sender ever spends more than they have. **Even if a block has a valid hash, it is invalid if it creates a negative balance.**

### Re-mining Tampered Blocks
If you tamper with a block, the chain becomes invalid. To fix it, you must **re-mine** the block:
1. Open the invalid block's details
2. Click **"⛏️ Re-mine This Block"**
3. A Web Worker will find a new valid nonce
4. Once found, the block becomes valid, and the **next block's** `previousHash` is updated
5. You must then re-mine the *next* block, and so on, until the tip of the chain is reached

> **Note:** Re-mining fixes the *cryptographic* validity (hash/PoW). If you tampered a transaction amount to be invalid (e.g. sending 500 BTC when you only have 50), the block will **remain invalid** due to State Validation even after re-mining. You must correct the amount first.

### Mining Reward & Per-Miner Blocks
Before mining even starts, **each miner's block already includes a reward transaction** (`Network → MinerName: 50 BTC`) appended to the pending transactions. This means:
- If Alice, Bob, and Charlie are competing, Alice's block contains `[...pendingTxs, Network→Alice 50 BTC]`, Bob's contains `[...pendingTxs, Network→Bob 50 BTC]`, and so on.
- Because the reward transaction is different, each miner's **Merkle root is different**, which means they are genuinely hashing completely different block data — even though the user-submitted transactions are the same.
- Only the **winning miner's block** (with their reward) gets added to the chain. The losing miners' blocks (and their reward transactions) are discarded.

This mirrors Bitcoin's **coinbase transaction** — the first transaction in every block that creates new BTC and pays the miner.

---

## 🏗️ Architecture & File Structure

```
blockchain-mining-simulator/
├── index.html          ← UI layout: header, sidebar, blockchain grid, block detail modal
├── styles.css          ← Full styling: dark/light themes, animations, responsive layout
├── blockchain.js       ← Core engine: Transaction, Block, Blockchain, MerkleTree, sha256
├── app.js              ← Application logic: UI updates, mining orchestration, Web Workers
├── miner-worker.js     ← Standalone mining worker (legacy fallback)
├── README.md           ← This file
├── LICENSE             ← MIT License
└── .gitignore
```

### `blockchain.js` — Core Engine

Contains all blockchain data structures and logic, no DOM interaction.

| Class / Function | Purpose |
|---|---|
| `sha256(message)` | Custom hash function producing 64-char hex output; uses bit-rotation and `Math.imul` for uniform distribution |
| `Transaction` | Stores `sender`, `receiver`, `amount`, `timestamp`; provides `toObject()` and `getHash()` |
| `MerkleTree` | Static class with `getRoot(transactions)` — builds a binary Merkle tree and returns the root hash |
| `Block` | Represents a single block: `index`, `timestamp`, `transactions[]`, `previousHash`, `difficulty`, `merkleRoot`, `nonce`, `minedBy`, `hash` |
| `Blockchain` | The chain manager: creates genesis block (gives 50 BTC to each participant), manages pending transactions, creates per-miner blocks, adds winning blocks, validates the entire chain, computes balances, supports tampering for educational purposes |

**Key design decisions:**
- Each miner gets their **own copy of the block** (with their own reward transaction), so they produce different hashes — just like real mining
- The genesis block distributes **50 BTC** to all 6 network participants
- Balance validation accounts for **pending outgoing** transactions (double-spend prevention)
- `tamperTransaction()` intentionally breaks the chain for educational demonstration
- **Single Source of Truth** — `NETWORK_POOL` is defined only in `blockchain.js` and exported to `app.js` to ensure data consistency across the application

### `app.js` — Application Logic

Bridges the blockchain engine with the DOM. Contains:

| Function Group | Key Functions |
|---|---|
| **Theme** | `initTheme()`, `toggleTheme()`, `updateThemeIcon()` — dark/light theme toggle with localStorage |
| **Transactions** | `addTransaction()` — validates balance, creates transaction, updates UI |
| **Mining** | `startMining()` — spawns inline Web Workers for each miner, handles the race, `terminateAllWorkers()` |
| **Validation** | `validateChain()` — runs chain validation, updates status indicator, highlights invalid blocks |
| **Block Details** | `showBlockDetails(index)` — renders the block detail modal with tamper buttons |
| **Tampering** | `tamperTx()`, `tamperDate()` — modifies block data to demonstrate corruption |
| **UI Updates** | `updateUI()`, `updateStats()`, `updatePendingList()`, `updateBalances()`, `updateBlockchainView()` |
| **Toast** | `showToast(message, type)` — slide-in notification system |

**How the Mining Race Works:**
1. User clicks "Start Mining Race" → `startMining()` picks N random miners from the pool
2. For each miner, a unique `Block` is created via `blockchain.createBlockForMiner(minerName)` — each has a different reward transaction, producing a different Merkle root and thus different hashes
3. An **inline Web Worker** is created from a JavaScript string `Blob` — this avoids CORS issues with `file://` origins
4. Each worker starts with a **staggered nonce** (miner 0 starts at 0, miner 1 at 5M, etc.) to ensure they search different parts of the nonce space
5. Workers report progress at **random intervals** (3000–8000 hashes) so the dashboard doesn't appear artificially synchronized
6. First worker to find a hash with the required leading zeros posts a `SUCCESS` message → all other workers are terminated
7. The winning miner's block is added to the chain, pending transactions are cleared

### `styles.css` — Styling

- **CSS Custom Properties** — All colors, gradients, and shadows are defined as CSS variables in `:root` (dark) and `[data-theme="light"]` (light)
- **Responsive Layout** — CSS Grid (`380px sidebar + 1fr content`) collapses to single-column below 1000px
- **Animations** — Miner card pulse during mining, error block pulse for tampered blocks, hover lift on block cards, toast slide-in
- **Inter Font** — Loaded from Google Fonts for modern, clean typography

### `miner-worker.js` — Legacy Worker

A standalone Web Worker file that was the original mining worker. The application now uses inline `Blob` workers (defined in `app.js`) to avoid CORS restrictions, so this file serves as a fallback reference.

---

## 💡 Future Enhancement Ideas

Here are features that could be added to further improve this project:

### Core Blockchain
- **Peer-to-Peer Simulation** — Simulate multiple nodes on a network, each with their own copy of the chain, and implement block propagation / consensus
- **Fork Resolution** — When two miners find a block at the same time, simulate a temporary fork and implement "longest chain wins" resolution
- **Dynamic Difficulty Adjustment** — Automatically adjust difficulty every N blocks based on average mining time (like Bitcoin's 2016-block difficulty adjustment)
- **Transaction Pool (Mempool)** — Allow miners to select transactions based on fees, simulating real mempool behavior
- **Transaction Fees** — Add a fee field to transactions; miners pick the highest-fee transactions first

### Cryptography & Security
- **Digital Signatures** — Implement public/private key pairs (ECDSA) for transaction signing and verification
- **Wallet Addresses** — Generate wallet addresses from public keys (hash-based) instead of using plain names
- **Real SHA-256** — Replace the custom hash function with the Web Crypto API's `crypto.subtle.digest('SHA-256', ...)` for cryptographic-grade hashing

### Advanced Data Structures
- **UTXO Model** — Replace the account-based balance model with Bitcoin's Unspent Transaction Output model
- **Merkle Tree Visualization** — Graphically render the binary Merkle tree for each block, showing how the root is derived
- **Block Size Limit** — Enforce a maximum number of transactions per block; excess transactions stay in the mempool

### User Experience
- **Transaction History** — A timeline view showing all transactions for a specific user
- **Mining Statistics** — Charts showing hash rate over time, mining difficulty history, blocks mined per participant
- **Network Visualization** — An animated graph showing blocks being propagated between simulated nodes
- **Export / Import** — Save the blockchain state to JSON and reload it later
- **Sound Effects** — Audio cues for mining completion, validation success/failure, and new transactions

### Educational
- **Step-by-Step Mining Tutorial** — A guided walkthrough that explains each step of mining as it happens
- **51% Attack Simulation** — Demonstrate how a majority hashpower can rewrite blocks
- **Double-Spend Demo** — Show how an attacker could attempt to spend the same coins twice and how the network prevents it
- **Consensus Algorithms Comparison** — Add Proof-of-Stake (PoS) as an alternative mining mode to compare with PoW

---

## 📜 License

MIT License — feel free to use, modify, and share.
