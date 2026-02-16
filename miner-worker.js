/**
 * Mining Web Worker
 * Real parallel thread - runs on your CPU separately from main thread
 */

function sha256(message) {
    let hash = 0n;
    const prime = 31n;
    const mod = 2n ** 256n;

    for (let i = 0; i < message.length; i++) {
        hash = (hash * prime + BigInt(message.charCodeAt(i))) % mod;
    }

    return hash.toString(16).padStart(64, '0');
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

self.onmessage = function (e) {
    const { blockData, difficulty, minerName, startNonce } = e.data;

    const target = '0'.repeat(difficulty);
    let nonce = startNonce;
    let attempts = 0;

    // Mining loop - runs immediately without delay
    while (true) {
        nonce++;
        attempts++;

        const hash = calculateBlockHash(blockData, nonce);

        if (hash.startsWith(target)) {
            // Found valid hash!
            self.postMessage({
                type: 'SUCCESS',
                minerName: minerName,
                nonce: nonce,
                hash: hash,
                attempts: attempts
            });
            return;
        }

        // Report progress every 50k attempts
        if (attempts % 50000 === 0) {
            self.postMessage({
                type: 'PROGRESS',
                minerName: minerName,
                attempts: attempts,
                currentNonce: nonce
            });
        }
    }
};
