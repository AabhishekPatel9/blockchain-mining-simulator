/**
 * Application Logic
 * Dropdown transactions, random miners, winner gets reward
 */

let blockchain;
let isMining = false;
let activeWorkers = [];

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    blockchain = new Blockchain(4, 50);  // Difficulty 4, 50 BTC reward
    populateDropdowns();
    updateUI();
    showToast('🔗 Blockchain initialized! Each user starts with 50 BTC', 'success');
});

// Populate user dropdowns from network pool
function populateDropdowns() {
    const senderSelect = document.getElementById('sender');
    const receiverSelect = document.getElementById('receiver');

    senderSelect.innerHTML = '';
    receiverSelect.innerHTML = '';

    NETWORK_POOL.forEach((user, i) => {
        senderSelect.innerHTML += `<option value="${user.name}" ${i === 0 ? 'selected' : ''}>${user.name}</option>`;
        receiverSelect.innerHTML += `<option value="${user.name}" ${i === 1 ? 'selected' : ''}>${user.name}</option>`;
    });
}

// Get random miners from pool
function getRandomMiners(count) {
    const shuffled = [...NETWORK_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// ============== TRANSACTIONS ==============

function addTransaction() {
    const sender = document.getElementById('sender').value;
    const receiver = document.getElementById('receiver').value;
    const amount = parseFloat(document.getElementById('amount').value);

    if (sender === receiver) {
        showToast('Sender and receiver must be different', 'error');
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        showToast('Enter a valid amount', 'error');
        return;
    }

    // Check sender has enough balance (including pending outgoing)
    const currentBalance = blockchain.getBalance(sender);
    const pendingOutgoing = blockchain.pendingTransactions
        .filter(tx => tx.sender === sender)
        .reduce((sum, tx) => sum + tx.amount, 0);
    const availableBalance = currentBalance - pendingOutgoing;

    if (amount > availableBalance) {
        showToast(`❌ Insufficient funds! ${sender} has ${availableBalance.toFixed(2)} BTC available`, 'error');
        return;
    }

    const tx = new Transaction(sender, receiver, amount);
    blockchain.addTransaction(tx);

    showToast(`✅ ${sender} → ${receiver}: ${amount} BTC`, 'success');
    updateUI();

    document.getElementById('amount').value = '';
}

// ============== MINING ==============

// Inline worker code with proper hash distribution
const workerCode = `
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

function calculateBlockHash(blockData, nonce) {
    const data = JSON.stringify({
        index: blockData.index,
        timestamp: blockData.timestamp,
        merkleRoot: blockData.merkleRoot,
        previousHash: blockData.previousHash,
        nonce: nonce
    });
    return sha256(data);
}

self.onmessage = function(e) {
    const { blockData, difficulty, minerName, startNonce } = e.data;
    const target = '0'.repeat(difficulty);
    let nonce = startNonce;
    let attempts = 0;
    
    // Random report interval (3000-8000) so miners don't appear synced
    const reportInterval = 3000 + Math.floor(Math.random() * 5000);
    
    while (true) {
        nonce++;
        attempts++;
        const hash = calculateBlockHash(blockData, nonce);
        
        if (hash.startsWith(target)) {
            self.postMessage({ type: 'SUCCESS', minerName, nonce, hash, attempts });
            return;
        }
        
        if (attempts % reportInterval === 0) {
            self.postMessage({ type: 'PROGRESS', minerName, attempts, currentNonce: nonce });
        }
    }
};
`;

function createMinerWorker() {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
}

function startMining() {
    if (isMining) {
        showToast('Mining already in progress', 'warning');
        return;
    }

    if (blockchain.pendingTransactions.length === 0) {
        showToast('Add some transactions first!', 'warning');
        return;
    }

    const numMiners = parseInt(document.getElementById('numMiners').value) || 3;

    // Select random miners from pool
    const selectedMiners = getRandomMiners(numMiners);

    isMining = true;
    updateMineButton(true);
    showMiningPanel(true, selectedMiners);

    const startTime = Date.now();
    const minerStats = {};
    const minerBlocks = {}; // Each miner has their own block

    selectedMiners.forEach(m => {
        minerStats[m.name] = { attempts: 0, currentNonce: 0, color: m.color };
        // Create unique block for each miner with their reward
        minerBlocks[m.name] = blockchain.createBlockForMiner(m.name);
    });

    updateMinerDisplay(minerStats, null);

    let winnerFound = false;

    // Spawn inline workers for each miner
    selectedMiners.forEach((miner, i) => {
        const worker = createMinerWorker();
        const minerBlock = minerBlocks[miner.name];
        const blockData = minerBlock.getMiningData();

        worker.onmessage = (e) => {
            const { type, minerName, nonce, hash, attempts, currentNonce } = e.data;

            if (type === 'SUCCESS' && !winnerFound) {
                winnerFound = true;

                // Use the winning miner's block
                const winningBlock = minerBlocks[minerName];
                winningBlock.setMinedData(nonce, hash, minerName);
                blockchain.addMinedBlock(winningBlock);

                const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

                terminateAllWorkers();

                minerStats[minerName].attempts = attempts;
                showMiningResult(minerName, nonce, hash, timeTaken, minerStats);

                isMining = false;
                updateMineButton(false);
                updateUI();

                showToast(`🏆 ${minerName} won! Block #${winningBlock.index} mined in ${timeTaken}s`, 'success');

            } else if (type === 'PROGRESS' && !winnerFound) {
                minerStats[minerName].attempts = attempts;
                minerStats[minerName].currentNonce = currentNonce;
                updateMinerDisplay(minerStats, null);
                updateMiningTime(startTime);
            }
        };

        // Start with staggered nonce
        worker.postMessage({
            blockData: blockData,
            difficulty: blockchain.difficulty,
            minerName: miner.name,
            startNonce: i * 5000000
        });

        activeWorkers.push(worker);
    });
}

function terminateAllWorkers() {
    activeWorkers.forEach(w => w.terminate());
    activeWorkers = [];
}

function updateMineButton(mining) {
    const btn = document.getElementById('mineBtn');
    btn.disabled = mining;
    btn.innerHTML = mining
        ? '<span class="icon">⏳</span> Mining...'
        : '<span class="icon">⛏️</span> Start Mining Race';
}

function showMiningPanel(show, miners) {
    const panel = document.getElementById('miningPanel');
    panel.classList.toggle('hidden', !show);

    if (show && miners) {
        const names = miners.map(m => m.name).join(', ');
        document.getElementById('miningStatus').innerHTML = `<strong>Miners competing:</strong> ${names}`;
    }
}

function updateMiningTime(startTime) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    document.getElementById('miningTime').textContent = `⏱️ ${elapsed}s`;
}

function updateMinerDisplay(stats, winnerId) {
    const container = document.getElementById('minerStats');
    let html = '';

    for (const [name, data] of Object.entries(stats)) {
        const isWinner = name === winnerId;
        html += `
            <div class="miner-card ${isWinner ? 'winner' : ''}" style="--miner-color: ${data.color}">
                <div class="miner-avatar">${name.charAt(0)}</div>
                <div class="miner-info">
                    <span class="miner-name">${isWinner ? '🏆 ' : ''}${name}</span>
                    <span class="miner-stat">${data.attempts.toLocaleString()} hashes</span>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function showMiningResult(winner, nonce, hash, time, allStats) {
    document.getElementById('miningStatus').innerHTML = `
        <strong>🏆 Winner: ${winner}</strong><br>
        Nonce: ${nonce.toLocaleString()} | Time: ${time}s
    `;
    document.getElementById('miningTime').textContent = `✅ Complete!`;
    updateMinerDisplay(allStats, winner);
}

// ============== VALIDATION ==============

function validateChain() {
    const result = blockchain.validateChain();
    const statusEl = document.getElementById('chainStatus');

    if (result.valid) {
        showToast('✅ Blockchain is valid!', 'success');
        statusEl.textContent = '✓ Valid';
        statusEl.className = 'status valid';
    } else {
        let msg = '❌ Chain is INVALID!\n';
        result.errors.forEach(e => msg += `Block #${e.block}: ${e.message}\n`);
        showToast(msg, 'error');
        statusEl.textContent = '✗ Invalid';
        statusEl.className = 'status invalid';
    }

    updateBlockchainView();
}

function updateDifficulty() {
    const val = parseInt(document.getElementById('difficultyInput').value);
    if (val >= 1 && val <= 6) {
        blockchain.difficulty = val;
        document.getElementById('currentDiff').textContent = val;
        showToast(`Difficulty: ${val} (${val} leading zeros)`, 'info');
    }
}

function resetBlockchain() {
    if (confirm('Reset entire blockchain?')) {
        terminateAllWorkers();
        isMining = false;
        blockchain.reset();
        updateMineButton(false);
        document.getElementById('miningPanel').classList.add('hidden');
        updateUI();
        showToast('Blockchain reset', 'info');
    }
}

// ============== BLOCK DETAILS ==============

function showBlockDetails(index) {
    const block = blockchain.chain[index];
    const modal = document.getElementById('blockModal');
    const content = document.getElementById('blockDetails');

    const date = new Date(block.timestamp).toLocaleString();
    const canTamper = index > 0;

    let html = `
        <div class="detail-grid">
            <div class="detail-box">
                <label>Block</label>
                <span>#${block.index}</span>
            </div>
            <div class="detail-box">
                <label>Mined By</label>
                <span class="miner-badge">${block.minedBy || 'Genesis'}</span>
            </div>
            <div class="detail-box">
                <label>Nonce</label>
                <span class="nonce">${block.nonce.toLocaleString()}</span>
            </div>
            <div class="detail-box">
                <label>Timestamp</label>
                <span>${date}</span>
                ${canTamper ? `<button class="btn-tamper-small" onclick="tamperDate(${index})">✏️</button>` : ''}
            </div>
        </div>
        
        <div class="hash-section">
            <div class="hash-item">
                <label>Previous Hash</label>
                <code>${block.previousHash}</code>
            </div>
            <div class="hash-item">
                <label>Merkle Root</label>
                <code>${block.merkleRoot}</code>
            </div>
            <div class="hash-item">
                <label>Block Hash</label>
                <code>${block.hash}</code>
            </div>
        </div>
        
        <h4>📝 Transactions (${block.transactions.length})</h4>
        <div class="tx-list">
    `;

    block.transactions.forEach((tx, txIdx) => {
        const isReward = tx.sender === 'Network';
        html += `
            <div class="tx-item ${isReward ? 'reward' : ''}">
                <div class="tx-flow">
                    <span class="tx-party">${tx.sender}</span>
                    <span class="tx-arrow">→</span>
                    <span class="tx-party">${tx.receiver}</span>
                </div>
                <div class="tx-amount-box">
                    <span class="tx-amount" id="txAmt-${index}-${txIdx}">${tx.amount}</span>
                    ${isReward ? '<span class="reward-badge">⛏️ Mining Reward</span>' : ''}
                </div>
                ${canTamper && !isReward ? `
                    <button class="btn-tamper" onclick="tamperTx(${index}, ${txIdx})">🔧 Tamper</button>
                ` : ''}
            </div>
        `;
    });

    html += '</div>';
    content.innerHTML = html;
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('blockModal').classList.add('hidden');
}

function tamperTx(blockIdx, txIdx) {
    const newAmt = prompt('Enter new amount:', '99999');
    if (newAmt === null) return;

    const amt = parseFloat(newAmt);
    if (isNaN(amt)) {
        showToast('Invalid amount', 'error');
        return;
    }

    const result = blockchain.tamperTransaction(blockIdx, txIdx, amt);

    if (result.success) {
        const el = document.getElementById(`txAmt-${blockIdx}-${txIdx}`);
        if (el) {
            el.textContent = amt;
            el.classList.add('tampered');
        }

        showToast(`🔧 Tampered: ${result.oldAmount} → ${result.newAmount}\nChain is now invalid!`, 'warning');
        updateUI();
        showBlockDetails(blockIdx); // Refresh modal
    }
}

function tamperDate(blockIdx) {
    const block = blockchain.chain[blockIdx];
    const currentDate = new Date(block.timestamp);
    const newDateStr = prompt('Enter new date (YYYY-MM-DD HH:MM):',
        currentDate.toISOString().slice(0, 16).replace('T', ' '));

    if (!newDateStr) return;

    const newDate = new Date(newDateStr.replace(' ', 'T'));
    if (isNaN(newDate.getTime())) {
        showToast('Invalid date format', 'error');
        return;
    }

    block.timestamp = newDate.getTime();
    showToast(`🔧 Timestamp changed!\nChain is now invalid!`, 'warning');
    updateUI();
    showBlockDetails(blockIdx); // Refresh modal
}
// ============== UI UPDATES ==============

function updateUI() {
    updateStats();
    updatePendingList();
    updateBalances();
    updateBlockchainView();
}

function updateStats() {
    document.getElementById('totalBlocks').textContent = blockchain.chain.length;
    document.getElementById('currentDiff').textContent = blockchain.difficulty;
    document.getElementById('pendingCount').textContent = blockchain.pendingTransactions.length;
}

function updatePendingList() {
    const container = document.getElementById('pendingList');

    if (blockchain.pendingTransactions.length === 0) {
        container.innerHTML = '<p class="empty">No pending transactions</p>';
        return;
    }

    let html = '';
    blockchain.pendingTransactions.forEach((tx, i) => {
        html += `
            <div class="pending-item">
                <span class="pending-num">${i + 1}</span>
                <span class="pending-text">${tx.sender} → ${tx.receiver}: <strong>${tx.amount}</strong></span>
            </div>
        `;
    });

    container.innerHTML = html;
}

function updateBalances() {
    const container = document.getElementById('balances');
    const balances = blockchain.getAllBalances();

    let html = '';
    for (const [addr, bal] of Object.entries(balances)) {
        const user = NETWORK_POOL.find(p => p.name === addr);
        const color = user ? user.color : '#666';
        const cls = bal > 0 ? 'positive' : bal < 0 ? 'negative' : '';

        html += `
            <div class="balance-row">
                <div class="balance-user">
                    <span class="user-dot" style="background: ${color}"></span>
                    <span>${addr}</span>
                </div>
                <span class="balance-amt ${cls}">${bal.toFixed(2)}</span>
            </div>
        `;
    }

    container.innerHTML = html || '<p class="empty">No balances</p>';
}

function updateBlockchainView() {
    const container = document.getElementById('blockchainView');
    const validation = blockchain.validateChain();

    // Find first invalid block - all blocks from there onwards are affected
    const invalidBlocks = new Set(validation.errors.map(e => e.block));
    const firstInvalid = invalidBlocks.size > 0 ? Math.min(...invalidBlocks) : -1;

    let html = '';

    blockchain.chain.forEach((block, idx) => {
        // Block is invalid if it has errors OR comes after first invalid block
        const isInvalid = idx >= firstInvalid && firstInvalid !== -1;
        const hasDirectError = invalidBlocks.has(idx);
        const isGenesis = idx === 0;
        const user = NETWORK_POOL.find(p => p.name === block.minedBy);
        const color = user ? user.color : '#6366f1';

        html += `
            <div class="block-card ${isInvalid ? 'invalid' : ''} ${hasDirectError ? 'error-source' : ''}" onclick="showBlockDetails(${idx})" style="--block-color: ${color}">
                <div class="block-num">${isGenesis ? '🌟' : '#' + idx}${hasDirectError ? ' ⚠️' : isInvalid ? ' 🔗' : ''}</div>
                <div class="block-miner">${block.minedBy || 'Genesis'}</div>
                <div class="block-hash">${block.hash.substring(0, 12)}...</div>
                <div class="block-info">
                    <span>Nonce: ${block.nonce.toLocaleString()}</span>
                    <span>${block.transactions.length} tx</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ============== TOAST ==============

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Close modal on backdrop click
document.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
    }
});
