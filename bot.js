const axios = require('axios');
const fs = require('fs');
const { ethers } = require('ethers');
const { HttpsProxyAgent } = require('https-proxy-agent');
const prompt = require('prompt-sync')(); // ✅ Import prompt-sync untuk input manual

const FAUCET_URL = 'https://faucet.0g.ai/api/faucet';
const CAPTCHA_API_KEY = '2captchaAPI'; // Replace with your 2Captcha API Key
const SITE_KEY = '914e63b4-ac20-4c24-bc92-cdb6950ccfde'; // hCaptcha site key from the faucet
const PROXY_LIST_FILE = 'proxy.txt'; // File containing proxy list

const HEADERS = {
    'Accept': '*/*',
    'Content-Type': 'application/json',
    'Origin': 'https://faucet.0g.ai',
    'Referer': 'https://faucet.0g.ai/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
};

// Input manual jumlah akun
let NUM_ACCOUNTS;
while (true) {
    NUM_ACCOUNTS = parseInt(prompt("Masukkan jumlah akun yang ingin dibuat: "));
    if (!isNaN(NUM_ACCOUNTS) && NUM_ACCOUNTS > 0) break;
    console.log("Harap masukkan angka yang valid!");
}

// Load proxies from file
const proxies = fs.existsSync(PROXY_LIST_FILE) ? fs.readFileSync(PROXY_LIST_FILE, 'utf-8').split('\n').map(p => p.trim()).filter(p => p) : [];

// Function to get a random proxy
function getRandomProxy() {
    if (proxies.length === 0) return null;
    return proxies[Math.floor(Math.random() * proxies.length)];
}

// Function to solve hCaptcha using 2Captcha (Tanpa Proxy)
async function solveCaptcha() {
    try {
        // Step 1: Request captcha solving (Tanpa Proxy)
        const response = await axios.get(`http://2captcha.com/in.php?key=${CAPTCHA_API_KEY}&method=hcaptcha&sitekey=${SITE_KEY}&pageurl=https://faucet.0g.ai&json=1`);
        if (response.data.status !== 1) throw new Error('Failed to send captcha to 2Captcha');

        const requestId = response.data.request;
        console.log(`Captcha sent to 2Captcha, Request ID: ${requestId}`);

        // Step 2: Wait for the captcha to be solved
        let captchaResponse;
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            const result = await axios.get(`http://2captcha.com/res.php?key=${CAPTCHA_API_KEY}&action=get&id=${requestId}&json=1`);
            if (result.data.status === 1) {
                captchaResponse = result.data.request;
                break;
            }
            console.log('Waiting for captcha solution...');
        }

        console.log(`Captcha solved: ${captchaResponse}`);
        return captchaResponse;
    } catch (error) {
        console.error('Error solving captcha:', error.message);
        return null;
    }
}

(async () => {
    for (let i = 0; i < NUM_ACCOUNTS; i++) {
        // Generate a new Ethereum wallet
        const wallet = ethers.Wallet.createRandom();
        const walletAddress = wallet.address;
        const privateKey = wallet.privateKey;

        // Save private key to wallet.txt
        fs.appendFileSync('wallet.txt', `${walletAddress} - ${privateKey}\n`);
        console.log(`Generated Address ${i + 1}: ${walletAddress}`);
        console.log(`Private Key saved to wallet.txt`);

        // Solve hCaptcha (Tanpa Proxy)
        const hcaptchaToken = await solveCaptcha();
        if (!hcaptchaToken) {
            console.error('Failed to solve hCaptcha. Skipping...');
            continue;
        }

        // Select a random proxy for claiming faucet
        const proxy = getRandomProxy();
        console.log(`Using proxy for claim: ${proxy || 'None'}`);

        // Claim faucet (Menggunakan Proxy)
        try {
            const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;
            const response = await axios.post(FAUCET_URL, {
                address: walletAddress,
                hcaptchaToken: hcaptchaToken
            }, { headers: HEADERS, httpsAgent: agent });

            console.log(`Faucet Response for ${walletAddress}:`, response.data);
        } catch (error) {
            console.error(`Error claiming for ${walletAddress}:`, error.response ? error.response.data : error.message);
        }

        // Wait 10 seconds before processing the next wallet
        console.log('Waiting 10 seconds before next claim...');
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
})();
