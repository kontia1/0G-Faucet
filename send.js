const { ethers } = require('ethers');
const fs = require('fs');

// Konfigurasi RPC
const RPC_URL = 'https://og-testnet-evm.itrocket.net';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Membaca private keys dari wallet.txt
const walletFile = 'wallet.txt';
const privateKeys = fs.readFileSync(walletFile, 'utf-8')
    .split('\n')
    .map(line => line.split(' - ')[1]) // Ambil hanya private key setelah " - "
    .filter(key => key); // Hapus baris kosong

// Konfigurasi wallet penerima
const receivers = [
    "0xwallettarget",
];
const amountToSend = ethers.parseEther('0.097'); // Kirim 0.097 ETH
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 detik

async function sendTransactionWithRetry(privateKey, retryCount = 0) {
    try {
        const wallet = new ethers.Wallet(privateKey, provider);
        const balance = await provider.getBalance(wallet.address);
        console.log(`📢 Wallet: ${wallet.address} | Balance: ${ethers.formatEther(balance)} ETH`);

        const gasPrice = (await provider.getFeeData()).gasPrice * 2n; // Meningkatkan gas price 2x
        
        if (balance < amountToSend + gasPrice * 28000n) {
            console.log(`⚠️ Saldo tidak cukup untuk transaksi + gas fee.`);
            return;
        }

        for (const receiver of receivers) {
            try {
                const tx = await wallet.sendTransaction({
                    to: receiver,
                    value: amountToSend,
                    gasLimit: 28000,
                    gasPrice: gasPrice
                });

                console.log(`🔄 Mengirim transaksi dari ${wallet.address} ke ${receiver}...`);
                console.log(`🔗 TX Hash: ${tx.hash}`);

                const receipt = await tx.wait();
                console.log(`✅ Transaksi berhasil ke ${receiver} di blok ${receipt.blockNumber}`);
            } catch (error) {
                console.error(`❌ Gagal mengirim transaksi ke ${receiver}:`, error);
                if (retryCount < MAX_RETRIES) {
                    console.log(`🔁 Mencoba ulang (${retryCount + 1}/${MAX_RETRIES}) dalam ${RETRY_DELAY / 1000} detik...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    return sendTransactionWithRetry(privateKey, retryCount + 1);
                } else {
                    console.log(`⛔ Gagal setelah ${MAX_RETRIES} percobaan, melewati transaksi ini.`);
                }
            }
        }
    } catch (error) {
        console.error(`❌ Gagal mengirim transaksi dari wallet:`, error);
    }
}

async function processWallets() {
    for (const privateKey of privateKeys) {
        await sendTransactionWithRetry(privateKey);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Tunggu 5 detik sebelum transaksi berikutnya
    }
}

processWallets();
