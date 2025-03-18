# 🚀 0G Faucet Automation Bot


## 📌 Overview
0G Faucet Automation Bot adalah bot otomatis yang digunakan untuk mengklaim token gratis dari [0G Faucet](https://faucet.0g.ai).  
Bot ini dapat membuat wallet Ethereum secara acak, menyelesaikan hCaptcha menggunakan **2Captcha**, dan mengklaim faucet menggunakan **proxy**.  

## ⚡ Features
✅ **Generate Wallet** - Membuat wallet Ethereum secara acak.  
✅ **Solve hCaptcha** - Menggunakan 2Captcha untuk bypass captcha.  
✅ **Support Proxy** - Menggunakan proxy saat klaim faucet untuk menghindari batasan.  
✅ **Custom Account Input** - Jumlah akun dapat diatur secara manual saat menjalankan bot.  

## 🛠 Installation
1. **Clone repositori ini**  
```
git clone https://github.com/kontia1/0G-Faucet.git
cd 0G-Faucet
```

2. Install dependencies
```sh
npm install axios ethers https-proxy-agent prompt-sync
```

3. Ganti 2captcha API
```
nano bot.js
```
const CAPTCHA_API_KEY = '2captchaAPI'
ganti 2captchaAPI dengan api kalian
https://2captcha.com/

4. proxy
```
nano proxy.txt
```
Tambahkan daftar proxy di file proxy.txt (format http://ip:port atau http://user:pass@ip:port).
Jika tidak menggunakan proxy, bot tetap dapat berjalan.

5. Jalankan Bot
```
node bot.js
```
6. Fitur tambahan auto send dari wallet yg sudah melakukan faucet ke wallet yg di tentukan
```
nano bot.js
```
ganti 0xwallettarget menjadi wallet kamu
