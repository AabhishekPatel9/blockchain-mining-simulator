# ⛓️ Blockchain Mining Simulator

An interactive, browser-based blockchain simulator that visualizes how blockchains work — from transactions and Merkle trees to competitive proof-of-work mining.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## ✨ Features

- **Proof-of-Work Mining Race** — Multiple miners compete in real-time using Web Workers, each searching for a valid nonce independently
- **Transaction System** — Create transactions between network participants with balance validation
- **Merkle Tree** — Transactions are hashed into a Merkle root for block integrity
- **Chain Validation** — Verify the entire blockchain's integrity at any time
- **Tamper Detection** — Modify block data (amounts, dates) and watch the chain detect the corruption
- **Block Explorer** — Click any block to inspect its full details (hash, nonce, transactions, timestamps)
- **Adjustable Difficulty** — Change the number of leading zeros required in the hash
- **Live Mining Dashboard** — Watch miners race with real-time hash attempt counters

## 🚀 Getting Started

No build tools or dependencies required — just open the HTML file!

1. **Clone the repo**
   ```bash
   git clone https://github.com/AabhishekPatel9/blockchain-mining-simulator.git
   cd blockchain-mining-simulator
   ```

2. **Open in browser**
   - Simply open `index.html` in any modern browser
   - Or use a local server:
     ```bash
     npx serve .
     ```

## 🎮 How to Use

1. **Add Transactions** — Select sender, receiver, and amount from the sidebar
2. **Mine a Block** — Click "Start Mining Race" to have random miners compete
3. **Explore Blocks** — Click any block in the chain to view full details
4. **Tamper & Validate** — Modify a block's data, then validate to see the chain break
5. **Adjust Difficulty** — Increase difficulty to see mining take longer

## 🏗️ Architecture

| File | Description |
|------|-------------|
| `index.html` | UI structure and layout |
| `styles.css` | Complete styling with dark theme |
| `blockchain.js` | Core classes — `Transaction`, `Block`, `Blockchain`, `MerkleTree`, `sha256` |
| `app.js` | Application logic, UI updates, Web Worker mining |
| `miner-worker.js` | Standalone mining worker (fallback) |

## 📜 License

MIT License — feel free to use, modify, and share.
