const axios = require('axios');
const fs = require('fs');
const { ethers } = require('ethers');
const { HttpsProxyAgent } = require('https-proxy-agent');
const prompt = require('prompt-sync')();

const FAUCET_URL = 'https://faucet.0g.ai/api/faucet';
const CAPTCHA_API_KEY = '2captchaAPI'; // Ganti dengan API Key 2Captcha
const SITE_KEY = '914e63b4-ac20-4c24-bc92-cdb6950ccfde'; // hCaptcha site key dari faucet
const PROXY_LIST_FILE = 'proxy.txt';
const USED_PROXIES = new Set();

const HEADERS = {
    'Accept': '*/*',
    'Content-Type': 'application/json',
    'Origin': 'https://faucet.0g.ai',
    'Referer': 'https://faucet.0g.ai/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
};

let NUM_ACCOUNTS;
while (true) {
    NUM_ACCOUNTS = parseInt(prompt("Masukkan jumlah akun yang ingin dibuat: "));
    if (!isNaN(NUM_ACCOUNTS) && NUM_ACCOUNTS > 0) break;
    console.log("Harap masukkan angka yang valid!");
}

// Load proxies
let proxies = fs.existsSync(PROXY_LIST_FILE) ? fs.readFileSync(PROXY_LIST_FILE, 'utf-8').split('\n').map(p => p.trim()).filter(p => p) : [];

function getAvailableProxy() {
    const availableProxies = proxies.filter(p => !USED_PROXIES.has(p));
    if (availableProxies.length === 0) return null;
    const proxy = availableProxies[Math.floor(Math.random() * availableProxies.length)];
    USED_PROXIES.add(proxy);
    return proxy;
}

async function solveCaptcha() {
    try {
        const response = await axios.get(`http://2captcha.com/in.php?key=${CAPTCHA_API_KEY}&method=hcaptcha&sitekey=${SITE_KEY}&pageurl=https://faucet.0g.ai&json=1`);
        if (response.data.status !== 1) throw new Error('Failed to send captcha to 2Captcha');

        const requestId = response.data.request;
        console.log(`Captcha sent to 2Captcha, Request ID: ${requestId}`);

        let captchaResponse;
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            const result = await axios.get(`http://2captcha.com/res.php?key=${CAPTCHA_API_KEY}&action=get&id=${requestId}&json=1`);
            if (result.data.status === 1) {
                captchaResponse = result.data.request;
                break;
            }
            console.log('Waiting for captcha solution...');
        }

        console.log(`Captcha solved successfully`);
        return captchaResponse;
    } catch (error) {
        console.error('Error solving captcha:', error.message);
        return null;
    }
}

async function claimFaucet(walletAddress, hcaptchaToken, useProxy = true) {
    let proxy = useProxy ? getAvailableProxy() : null;
    let retries = 3;
    while (retries > 0) {
        try {
            console.log(`Using proxy: ${proxy || 'None'}`);
            const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

            const response = await axios.post(FAUCET_URL, {
                address: walletAddress,
                hcaptchaToken: hcaptchaToken
            }, { headers: HEADERS, httpsAgent: agent, timeout: 5000 }); // Timeout 5 detik

            console.log(`Faucet Response for ${walletAddress}:`, response.data);
            return response.data;
        } catch (error) {
            console.error(`Error with proxy ${proxy}:`, error.response ? error.response.data : error.message);
            if (proxy) USED_PROXIES.add(proxy);
            proxy = getAvailableProxy();
            retries--;
        }
    }
    return null;
}

(async () => {
    for (let i = 0; i < NUM_ACCOUNTS; i++) {
        const wallet = ethers.Wallet.createRandom();
        const walletAddress = wallet.address;
        const privateKey = wallet.privateKey;

        fs.appendFileSync('wallet.txt', `${walletAddress} - ${privateKey}\n`);
        console.log(`Generated Address ${i + 1}: ${walletAddress}`);

        let hcaptchaToken = await solveCaptcha();
        if (!hcaptchaToken) {
            console.error('Failed to solve hCaptcha. Skipping...');
            continue;
        }

        let response = await claimFaucet(walletAddress, hcaptchaToken, true);

        // Jika gagal akibat Captcha, coba ulangi dengan token baru tanpa proxy
        if (!response || (response.message && response.message.includes('Invalid Captcha'))) {
            console.log(`Invalid Captcha detected. Solving new Captcha...`);
            hcaptchaToken = await solveCaptcha();
            if (!hcaptchaToken) {
                console.error('Failed to solve new Captcha. Skipping...');
                continue;
            }
            response = await claimFaucet(walletAddress, hcaptchaToken, false);
        }

        console.log('Waiting 10 seconds before next claim...');
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
})();
