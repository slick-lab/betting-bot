// index.js
// Main WhatsApp Bot with Baileys - Football Fixtures & Live Scores
// Uses session/creds.json for authentication

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const Pino = require('pino');
const fs = require('fs');
const path = require('path');

// Import bot modules
const { handleFixturesCommand } = require('./fixtures.js');
const { handleLiveScoreCommand } = require('./livescore.js');
const { setupWelcomeMessages } = require('./welcomemsg.js');
const { setupGoodbyeMessages } = require('./goodbyemsg.js');

// Configuration
const SESSION_DIR = './session'; // Directory for creds.json
const BOT_PREFIX = '/';
const BOT_NAME = '⚽ Football Bot';

// Ensure session directory exists
if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
    console.log(`📁 Created session directory: ${SESSION_DIR}`);
}

/**
 * Send typing indicator
 */
async function sendTypingIndicator(sock, chatId) {
    await sock.sendPresenceUpdate('composing', chatId);
}

/**
 * Handle help command
 */
async function handleHelp(sock, chatId) {
    const helpMessage = `⚽ *${BOT_NAME}* ⚽
━━━━━━━━━━━━━━━━━━━

📋 *Available Commands*

⚽ *Fixtures*
• /fixtures - List all leagues
• /fixtures premierleague - EPL fixtures
• /fixtures laliga - La Liga fixtures
• /fixtures seriea - Serie A fixtures
• /fixtures uefachampionsleague - UCL fixtures
• /fixtures all - All major leagues

📊 *Live Scores*
• /livescore - Live matches now
• /live - Shortcut for live
• /livescore all - Today's schedule
• /livescore finished - Recent results
• /livescore pl - Premier League
• /livescore sa - Serie A
• /livescore pd - La Liga

❓ *General*
• /help - Show this menu
• /ping - Check bot status

━━━━━━━━━━━━━━━━━━━
💡 Made with ❤️ for football fans!`;

    await sock.sendMessage(chatId, { text: helpMessage });
}

/**
 * Handle ping command
 */
async function handlePing(sock, chatId, startTime = Date.now()) {
    const ping = Date.now() - startTime;
    await sock.sendMessage(chatId, {
        text: `🏓 *Pong!*\n\n⏱️ Response time: ${ping}ms\n🟢 Bot is active and running!`
    });
}

/**
 * Main function to start the bot
 */
async function startBot() {
    console.log('🚀 Starting WhatsApp Football Bot...');
    
    // Load authentication state from session folder
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    
    // Create WhatsApp socket connection
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: Pino({ level: 'silent' }), // Set to 'info' for debugging
        browser: ['Football Bot', 'Chrome', '1.0.0'],
        syncFullHistory: false,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.templateMessage ||
                message.listMessage
            );
            if (requiresPatch) {
                message = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2
                            },
                            ...message
                        }
                    }
                };
            }
            return message;
        }
    });
    
    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('📱 Scan the QR code with WhatsApp to login');
            console.log('QR Code generated, waiting for scan...');
        }
        
        if (connection === 'connecting') {
            console.log('🔄 Connecting to WhatsApp...');
        }
        
        if (connection === 'open') {
            console.log('✅ Bot connected successfully!');
            console.log(`📱 Bot is now online as: ${sock.user.id}`);
            
            // Set bot presence to online
            await sock.sendPresenceUpdate('available');
            
            // Send startup message to a default group or just log
            console.log('🎉 Football Bot is ready to use!');
            console.log('📋 Commands: /help, /fixtures, /livescore');
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('🔴 Connection closed');
            
            if (shouldReconnect) {
                console.log('🔄 Attempting to reconnect...');
                startBot();
            } else {
                console.log('❌ User logged out. Please restart the bot and scan QR again.');
                console.log('💡 Tip: Delete the session folder and restart to get a new QR code');
            }
        }
    });
    
    // Handle credentials update (save creds.json when changed)
    sock.ev.on('creds.update', async () => {
        await saveCreds();
        console.log('💾 Credentials saved to session folder');
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
    
    console.log('✅ Welcome and Goodbye handlers initialized');
    
    // Handle incoming messages
    sock.ev.on('messages.upsert', async (messageUpdate) => {
        try {
            const msg = messageUpdate.messages[0];
            if (!msg.message || msg.key.fromMe) return; // Skip bot's own messages
            
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
                return; // Not a text message we can process
            }
            
            // Skip if not a command (doesn't start with prefix)
            if (!messageText.startsWith(BOT_PREFIX)) return;
            
            console.log(`📨 Received command: ${messageText} from ${isGroup ? 'Group' : 'Private'} chat: ${chatId}`);
            
            // Split command and arguments
            const commandParts = messageText.trim().split(/\s+/);
            const command = commandParts[0].toLowerCase();
            
            // Handle commands
            switch (command) {
                case '/help':
                case '/menu':
                case '/commands':
                    await handleHelp(sock, chatId);
                    break;
                
                case '/ping':
                case '/status':
                    await handlePing(sock, chatId, Date.now());
                    break;
                
                case '/fixtures':
                case '/fixture':
                    await sendTypingIndicator(sock, chatId);
                    await handleFixturesCommand(sock, messageText, chatId);
                    break;
                
                case '/livescore':
                case '/live':
                case '/scores':
                case '/results':
                    await sendTypingIndicator(sock, chatId);
                    await handleLiveScoreCommand(sock, messageText, chatId);
                    break;
                
                default:
                    // Unknown command
                    await sock.sendMessage(chatId, {
                        text: `❌ *Unknown command:* ${command}\n\n` +
                              `📋 Type /help to see all available commands.`
                    });
                    break;
            }
            
        } catch (error) {
            console.error('Error handling message:', error);
            // Don't crash the bot on individual message errors
        }
    });
    
    // Handle group participation updates (already handled by welcome/goodbye modules)
    // But we can add additional logging here
    sock.ev.on('group-participants.update', async (update) => {
        console.log(`👥 Group update: ${update.action} - ${update.participants.length} user(s) in ${update.id}`);
    });
    
    // Handle presence updates (optional)
    sock.ev.on('presence.update', async (update) => {
        // Just log, don't spam
        // console.log('Presence update:', update);
    });
    
    // Error handling for socket
    sock.ev.on('error', (error) => {
        console.error('Socket error:', error);
    });
    
    // Keep the bot running
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down bot...');
        await sock.sendPresenceUpdate('unavailable');
        await sock.logout();
        process.exit(0);
    });
}

// Start the bot
startBot().catch(error => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
});
