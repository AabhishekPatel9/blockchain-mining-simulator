/**
 * Blockchain Core Implementation
 * Network pool of users, transactions between pool members
 * Random miners compete, winner gets reward
 */

// Network participants (fixed pool)
const NETWORK_POOL = [
    { id: 'alice', name: 'Alice', color: '#6366f1' },
    { id: 'bob', name: 'Bob', color: '#10b981' },
    { id: 'charlie', name: 'Charlie', color: '#f59e0b' },
    { id: 'david', name: 'David', color: '#ef4444' },
    { id: 'eve', name: 'Eve', color: '#8b5cf6' },
    { id: 'frank', name: 'Frank', color: '#06b6d4' }
];

// Better hash function with uniform distribution
function sha256(message) {
    let h0 = 0x6a09e667 | 0;
    let h1 = 0xbb67ae85 | 0;
    let h2 = 0x3c6ef372 | 0;
    let h3 = 0xa54ff53a | 0;

    for (let i = 0; i < message.length; i++) {
        const c = message.charCodeAt(i);
        h0 = Math.imul(h0 ^ c, 0x85ebca6b) | 0;
        h1 = Math.imul(h1 ^ c, 0xc2b2ae35) | 0;
        h2 = Math.imul(h2 ^ c, 0x27d4eb2f) | 0;
        h3 = Math.imul(h3 ^ c, 0x165667b1) | 0;
        h0 = ((h0 << 13) | (h0 >>> 19)) ^ h1;
        h1 = ((h1 << 17) | (h1 >>> 15)) ^ h2;
        h2 = ((h2 << 5) | (h2 >>> 27)) ^ h3;
        h3 = ((h3 << 23) | (h3 >>> 9)) ^ h0;
    }
    h0 = Math.imul(h0 ^ (h0 >>> 16), 0x85ebca6b) | 0;
    h1 = Math.imul(h1 ^ (h1 >>> 13), 0xc2b2ae35) | 0;
    h2 = Math.imul(h2 ^ (h2 >>> 16), 0x27d4eb2f) | 0;
    h3 = Math.imul(h3 ^ (h3 >>> 13), 0x165667b1) | 0;

    return (h0 >>> 0).toString(16).padStart(8, '0') +
        (h1 >>> 0).toString(16).padStart(8, '0') +
        (h2 >>> 0).toString(16).padStart(8, '0') +
        (h3 >>> 0).toString(16).padStart(8, '0') +
        ((h0 ^ h1) >>> 0).toString(16).padStart(8, '0') +
        ((h2 ^ h3) >>> 0).toString(16).padStart(8, '0') +
        ((h0 ^ h2) >>> 0).toString(16).padStart(8, '0') +
        ((h1 ^ h3) >>> 0).toString(16).padStart(8, '0');
}

// ============== TRANSACTION ==============
class Transaction {
    constructor(sender, receiver, amount) {
        this.sender = sender;
        this.receiver = receiver;
        this.amount = parseFloat(amount);
        this.timestamp = Date.now();
    }

    toObject() {
        return {
            sender: this.sender,
            receiver: this.receiver,
            amount: this.amount,
            timestamp: this.timestamp
        };
    }

    getHash() {
        return sha256(JSON.stringify(this.toObject()));
    }
}

// ============== MERKLE TREE ==============
class MerkleTree {
    static getRoot(transactions) {
        if (transactions.length === 0) {
            return sha256('empty');
        }

        let hashes = transactions.map(tx => tx.getHash());

        while (hashes.length > 1) {
            if (hashes.length % 2 !== 0) {
                hashes.push(hashes[hashes.length - 1]);
            }

            const newLevel = [];
            for (let i = 0; i < hashes.length; i += 2) {
                newLevel.push(sha256(hashes[i] + hashes[i + 1]));
            }
            hashes = newLevel;
        }

        return hashes[0];
    }
}

// ============== BLOCK ==============
class Block {
    constructor(index, transactions, previousHash, difficulty = 4) {
        this.index = index;
        this.timestamp = Date.now();
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.difficulty = difficulty; // Store difficulty per block
        this.merkleRoot = MerkleTree.getRoot(transactions);
        this.nonce = 0;
        this.minedBy = null;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        const data = JSON.stringify({
            index: this.index,
            timestamp: this.timestamp,
            merkleRoot: this.merkleRoot,
            previousHash: this.previousHash,
            nonce: this.nonce
        });
        return sha256(data);
    }

    getMiningData() {
        return {
            index: this.index,
            timestamp: this.timestamp,
            merkleRoot: this.merkleRoot,
            previousHash: this.previousHash
        };
    }

    setMinedData(nonce, hash, minerName) {
        this.nonce = nonce;
        this.hash = hash;
        this.minedBy = minerName;
    }
}

// ============== BLOCKCHAIN ==============
class Blockchain {
    constructor(difficulty = 4, miningReward = 50) {
        this.difficulty = difficulty;
        this.miningReward = miningReward;
        this.chain = [];
        this.pendingTransactions = [];
        this.createGenesisBlock();
    }

    createGenesisBlock() {
        // Give initial 50 BTC to each network participant
        const initialTxs = NETWORK_POOL.map(user =>
            new Transaction('Network', user.name, 50)
        );
        const genesis = new Block(0, initialTxs, '0'.repeat(64), 0);
        genesis.minedBy = 'Genesis';
        this.chain.push(genesis);
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addTransaction(transaction) {
        this.pendingTransactions.push(transaction);
    }

    // Create block for specific miner (each miner mines their own version)
    createBlockForMiner(minerName) {
        if (this.pendingTransactions.length === 0) {
            return null;
        }

        // Add this miner's reward transaction
        const rewardTx = new Transaction('Network', minerName, this.miningReward);
        const allTransactions = [...this.pendingTransactions, rewardTx];

        const block = new Block(
            this.chain.length,
            allTransactions,
            this.getLatestBlock().hash,
            this.difficulty
        );

        return block;
    }

    // Add winning miner's block to chain
    addMinedBlock(block) {
        this.chain.push(block);
        this.pendingTransactions = [];
    }

    validateChain() {
        const errors = [];

        for (let i = 1; i < this.chain.length; i++) {
            const current = this.chain[i];
            const previous = this.chain[i - 1];

            // 1. Recalculate hash and compare to stored hash
            const recalculatedHash = current.calculateHash();
            if (current.hash !== recalculatedHash) {
                errors.push({
                    block: i,
                    type: 'HASH_MISMATCH',
                    message: 'Block data was tampered (hash mismatch)'
                });
            }

            // 2. Check previous hash link
            if (current.previousHash !== previous.hash) {
                errors.push({
                    block: i,
                    type: 'BROKEN_CHAIN',
                    message: 'Previous hash link broken'
                });
            }

            // 3. Check Merkle root
            const correctMerkle = MerkleTree.getRoot(current.transactions);
            if (current.merkleRoot !== correctMerkle) {
                errors.push({
                    block: i,
                    type: 'INVALID_MERKLE',
                    message: 'Merkle root mismatch (transactions tampered)'
                });
            }

            // 4. Check POW (use block's own difficulty)
            const target = '0'.repeat(current.difficulty || 1);
            if (!current.hash.startsWith(target)) {
                errors.push({
                    block: i,
                    type: 'INVALID_POW',
                    message: `Hash doesn't meet difficulty ${current.difficulty}`
                });
            }
        }

        return { valid: errors.length === 0, errors };
    }

    getBalance(address) {
        let balance = 0;
        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.sender === address) balance -= tx.amount;
                if (tx.receiver === address) balance += tx.amount;
            }
        }
        return balance;
    }

    getAllBalances() {
        const balances = {};

        // Initialize from pool
        NETWORK_POOL.forEach(p => {
            balances[p.name] = 0;
        });

        // Calculate from chain
        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.sender !== 'Network' && tx.sender !== 'Genesis') {
                    if (!(tx.sender in balances)) balances[tx.sender] = 0;
                }
                if (tx.receiver !== 'Network' && tx.receiver !== 'Genesis') {
                    if (!(tx.receiver in balances)) balances[tx.receiver] = 0;
                }
            }
        }

        for (const addr in balances) {
            balances[addr] = this.getBalance(addr);
        }

        return balances;
    }

    tamperTransaction(blockIndex, txIndex, newAmount) {
        if (blockIndex < 1 || blockIndex >= this.chain.length) {
            return { success: false, message: 'Invalid block' };
        }

        const block = this.chain[blockIndex];
        if (txIndex < 0 || txIndex >= block.transactions.length) {
            return { success: false, message: 'Invalid transaction' };
        }

        const oldAmount = block.transactions[txIndex].amount;
        block.transactions[txIndex].amount = parseFloat(newAmount);

        return { success: true, oldAmount, newAmount: parseFloat(newAmount) };
    }

    reset() {
        this.chain = [];
        this.pendingTransactions = [];
        this.createGenesisBlock();
    }
}

// Export
if (typeof window !== 'undefined') {
    window.NETWORK_POOL = NETWORK_POOL;
    window.Transaction = Transaction;
    window.MerkleTree = MerkleTree;
    window.Block = Block;
    window.Blockchain = Blockchain;
    window.sha256 = sha256;
}
