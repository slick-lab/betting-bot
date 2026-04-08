// index.js
// WhatsApp Football Bot - Fixtures & Live Scores
// Based on Knight Bot connection pattern

require('./settings');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const axios = require('axios');
const PhoneNumber = require('awesome-phonenumber');
const readline = require('readline');
const { rmSync, existsSync } = require('fs');
const { join } = require('path');

// Import bot modules
const { handleFixturesCommand } = require('./fixtures.js');
const { handleLiveScoreCommand } = require('./livescore.js');
const { setupWelcomeMessages } = require('./welcomemsg.js');
const { setupGoodbyeMessages } = require('./goodbyemsg.js');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMediaMessage,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay,
    Browsers
} = require("@whiskeysockets/baileys");
const NodeCache = require("node-cache");
const pino = require("pino");

// Global settings
global.botname = "⚽ FOOTBALL BOT";
global.themeemoji = "⚽";

// Read owner from settings or use default
let owner = [];
try {
    if (fs.existsSync('./data/owner.json')) {
        owner = JSON.parse(fs.readFileSync('./data/owner.json'));
    } else {
        owner = ["2347071825994@s.whatsapp.net"];
    }
} catch (err) {
    owner = ["2347071825994@s.whatsapp.net"];
}

// Pairing code configuration
let phoneNumber = process.env.PHONE_NUMBER || "";
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code");
const useMobile = process.argv.includes("--mobile");

// Create readline interface for pairing code input
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

/**
 * Main bot function
 */
async function startFootballBot() {
    try {
        console.log(chalk.green('🚀 Starting Football Bot...'));
        
        // Get latest Baileys version
        let { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(chalk.cyan(`📡 Using Baileys version: ${version}`));
        
        // Load authentication state
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        const msgRetryCounterCache = new NodeCache();
        
        // Create socket connection
        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: Browsers.ubuntu('Chrome'),
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
        });
        
        // Save credentials when updated
        sock.ev.on('creds.update', saveCreds);
        
        // Handle pairing code if needed
        if (pairingCode && !state.creds.registered) {
            if (useMobile) throw new Error('Cannot use pairing code with mobile api');
            
            let userPhoneNumber;
            if (phoneNumber) {
                userPhoneNumber = phoneNumber;
            } else {
                userPhoneNumber = await question(chalk.bgBlack(chalk.greenBright(`📱 Please type your WhatsApp number (without + or spaces): `)));
            }
            
            // Clean the phone number
            userPhoneNumber = userPhoneNumber.replace(/[^0-9]/g, '');
            
            // Validate phone number
            const pn = require('awesome-phonenumber');
            if (!pn('+' + userPhoneNumber).isValid()) {
                console.log(chalk.red('❌ Invalid phone number. Please enter your full international number (e.g., 2347071825994 for Nigeria)'));
                process.exit(1);
            }
            
            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(userPhoneNumber);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log(chalk.black(chalk.bgGreen(`📱 Your Pairing Code: ${code}`)));
                    console.log(chalk.yellow(`\n📌 Instructions:\n1. Open WhatsApp\n2. Go to Settings > Linked Devices\n3. Tap "Link a Device"\n4. Enter the code above`));
                } catch (error) {
                    console.error(chalk.red('❌ Error requesting pairing code:', error));
                }
            }, 3000);
        }
        
        // Handle connection updates
        sock.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect, qr } = s;
            
            if (qr) {
                console.log(chalk.yellow('📱 QR Code generated. Scan with WhatsApp to login.'));
            }
            
            if (connection === 'connecting') {
                console.log(chalk.yellow('🔄 Connecting to WhatsApp...'));
            }
            
            if (connection === "open") {
                console.log(chalk.green(`✅ Connected as: ${JSON.stringify(sock.user, null, 2)}`));
                
                // Send success message to owner
                try {
                    for (let ownerId of owner) {
                        await sock.sendMessage(ownerId, {
                            text: `⚽ *${global.botname}* ⚽\n\n✅ Bot Connected Successfully!\n📱 Name: ${sock.user.name || sock.user.id}\n⏰ Time: ${new Date().toLocaleString()}\n\n📋 Commands: /help, /fixtures, /livescore`
                        });
                    }
                } catch (error) {
                    console.error('Error sending connection message:', error.message);
                }
                
                console.log(chalk.magenta(`\n╔════════════════════════════════╗`));
                console.log(chalk.magenta(`║     ${global.botname}     ║`));
                console.log(chalk.magenta(`╚════════════════════════════════╝\n`));
                console.log(chalk.cyan(`⚽ Bot is ONLINE and READY!`));
                console.log(chalk.cyan(`📋 Commands: /help, /fixtures, /livescore`));
            }
            
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                
                console.log(chalk.red(`❌ Connection closed: ${lastDisconnect?.error}`));
                
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    try {
                        rmSync('./session', { recursive: true, force: true });
                        console.log(chalk.yellow('📁 Session folder deleted. Please re-authenticate.'));
                    } catch (error) {
                        console.error('Error deleting session:', error);
                    }
                }
                
                if (shouldReconnect) {
                    console.log(chalk.yellow('🔄 Reconnecting in 5 seconds...'));
                    await delay(5000);
                    startFootballBot();
                } else {
                    console.log(chalk.red('❌ Logged out. Please restart the bot.'));
                }
            }
        });
        
        // Setup welcome and goodbye message handlers
        await setupWelcomeMessages(sock, {
            showRules: true,
            showMemberCount: true,
            showJoinTime: true,
            showProfilePicture: false
        });
        
        await setupGoodbyeMessages(sock, {
            showQuote: true,
            showMemberCountUpdate: true,
            emotionalResponse: true,
            mentionUser: true
        });
        
        console.log(chalk.green('✅ Welcome and Goodbye handlers initialized'));
        
        // Handle incoming messages
        sock.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const msg = chatUpdate.messages[0];
                if (!msg.message) return;
                
                // Skip status broadcasts
                if (msg.key && msg.key.remoteJid === 'status@broadcast') return;
                
                // Skip bot's own messages
                if (msg.key.fromMe) return;
                
                const chatId = msg.key.remoteJid;
                const isGroup = chatId.endsWith('@g.us');
                
                // Extract message text
                let messageText = '';
                if (msg.message.conversation) {
                    messageText = msg.message.conversation;
                } else if (msg.message.extendedTextMessage?.text) {
                    messageText = msg.message.extendedTextMessage.text;
                } else if (msg.message.imageMessage?.caption) {
                    messageText = msg.message.imageMessage.caption;
                } else {
                    return;
                }
                
                // Skip if not a command
                if (!messageText.startsWith('/')) return;
                
                console.log(chalk.blue(`📨 Command: ${messageText} from ${isGroup ? 'Group' : 'Private'}`));
                
                // Handle commands
                if (messageText === '/help' || messageText === '/menu') {
                    const helpMessage = `⚽ *${global.botname}* ⚽
━━━━━━━━━━━━━━━━━━━

📋 *Available Commands*

⚽ *Fixtures*
/fixtures - List all leagues
/fixtures premierleague - EPL fixtures
/fixtures laliga - La Liga fixtures
/fixtures seriea - Serie A fixtures
/fixtures uefachampionsleague - UCL fixtures
/fixtures all - All major leagues

📊 *Live Scores*
/livescore - Live matches now
/live - Shortcut for live
/livescore all - Today's schedule
/livescore finished - Recent results
/livescore pl - Premier League
/livescore sa - Serie A
/livescore pd - La Liga

❓ *General*
/help - Show this menu
/ping - Check bot status

━━━━━━━━━━━━━━━━━━━
💡 Made for football fans!`;
                    
                    await sock.sendMessage(chatId, { text: helpMessage });
                }
                else if (messageText === '/ping') {
                    await sock.sendMessage(chatId, { text: '🏓 Pong! Bot is active!' });
                }
                else if (messageText.startsWith('/fixtures')) {
                    await handleFixturesCommand(sock, messageText, chatId);
                }
                else if (messageText.startsWith('/livescore') || messageText.startsWith('/live')) {
                    await handleLiveScoreCommand(sock, messageText, chatId);
                }
                else {
                    await sock.sendMessage(chatId, {
                        text: `❌ Unknown command: ${messageText}\n\n📋 Type /help to see available commands.`
                    });
                }
                
            } catch (err) {
                console.error(chalk.red('Error in messages.upsert:', err));
            }
        });
        
        // Handle group participant updates (additional logging)
        sock.ev.on('group-participants.update', async (update) => {
            console.log(chalk.cyan(`👥 Group update: ${update.action} - ${update.participants.length} user(s)`));
        });
        
        return sock;
        
    } catch (error) {
        console.error(chalk.red('❌ Error in startFootballBot:', error));
        await delay(5000);
        startFootballBot();
    }
}

// Create settings.js if it doesn't exist
if (!fs.existsSync('./settings.js')) {
    const defaultSettings = `// settings.js
module.exports = {
    version: '1.0.0',
    botName: '⚽ Football Bot',
    ownerNumber: '2347071825994@s.whatsapp.net',
    storeWriteInterval: 10000
};`;
    fs.writeFileSync('./settings.js', defaultSettings);
    console.log(chalk.green('✅ Created default settings.js'));
}

// Create data directory and owner.json if they don't exist
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data', { recursive: true });
    fs.writeFileSync('./data/owner.json', JSON.stringify(["2347071825994@s.whatsapp.net"], null, 2));
    console.log(chalk.green('✅ Created data directory and owner.json'));
}

// Start the bot
startFootballBot().catch(error => {
    console.error(chalk.red('❌ Fatal error:', error));
    process.exit(1);
});

// Handle process events
process.on('uncaughtException', (err) => {
    console.error(chalk.red('Uncaught Exception:', err));
});

process.on('unhandledRejection', (err) => {
    console.error(chalk.red('Unhandled Rejection:', err));
});

// Auto-restart on file change
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`🔄 ${__filename} updated, restarting...`));
    delete require.cache[file];
    require(file);
});