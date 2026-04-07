// goodbyemsg.js
// Advanced goodbye message handler with user tagging, stats, and emotional farewells

const fs = require('fs');
const path = require('path');

// Load settings if settings.js exists
let settings = {};
try {
    const settingsPath = path.join(__dirname, 'settings.js');
    if (fs.existsSync(settingsPath)) {
        settings = require('./settings.js');
    }
} catch (err) {
    console.log('No settings.js found, using defaults');
}

/**
 * Get user's profile picture
 * @param {Object} sock - Baileys socket
 * @param {String} jid - User's JID
 * @returns {Promise<String|null>} - Profile picture URL or null
 */
async function getUserProfilePicture(sock, jid) {
    try {
        const ppUrl = await sock.profilePictureUrl(jid, 'image');
        return ppUrl;
    } catch (err) {
        return null;
    }
}

/**
 * Format leave time
 * @returns {String} - Formatted time string
 */
function getFormattedTime() {
    const now = new Date();
    const options = { 
        hour: 'numeric', 
        minute: 'numeric', 
        hour12: true,
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    };
    return now.toLocaleString('en-US', options);
}

/**
 * Get random goodbye emoji based on vibe
 * @param {String} action - 'remove' or 'leave'
 * @returns {String} - Random emoji combo
 */
function getRandomGoodbyeEmoji(action = 'remove') {
    const sadEmojis = ['😢', '😭', '💔', '🥺', '😔', '😞', '😟', '😕', '🙁', '😥'];
    const neutralEmojis = ['👋', '✌️', '🤝', '👏', '💫', '✨', '🌟', '🏃', '🚶', '📤'];
    
    if (action === 'remove') {
        return sadEmojis[Math.floor(Math.random() * sadEmojis.length)];
    }
    return neutralEmojis[Math.floor(Math.random() * neutralEmojis.length)];
}

/**
 * Calculate how long user was in group
 * @param {String} joinDate - User's join date if tracked
 * @returns {String} - Duration string
 */
function calculateMembershipDuration(joinDate) {
    if (!joinDate) return null;
    
    const join = new Date(joinDate);
    const now = new Date();
    const diffTime = Math.abs(now - join);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'less than a day';
    if (diffDays === 1) return '1 day';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week(s)`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month(s)`;
    return `${Math.floor(diffDays / 365)} year(s)`;
}

/**
 * Get inspirational goodbye quote
 * @returns {String} - Random quote
 */
function getRandomGoodbyeQuote() {
    const quotes = [
        '💫 "Don\'t cry because it\'s over, smile because it happened." - Dr. Seuss',
        '🌅 "Every new beginning comes from some other beginning\'s end." - Seneca',
        '🚪 "When one door closes, another opens." - Alexander Graham Bell',
        '💪 "Goodbyes are not forever. Goodbyes are not the end."',
        '🌟 "You\'ll be missed! The group won\'t be the same without you."',
        '🎯 "May your football journey be filled with goals and victories!"',
        '⚽ "Once a member, always a member. The pitch is always open for you!"',
        '🌈 "Wishing you all the best in your next adventure!"'
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
}

/**
 * Get user's message count if tracked (for stats)
 * @param {String} userId - User's JID
 * @returns {Number} - Number of messages sent
 */
function getUserMessageCount(userId) {
    // This would require a database to track properly
    // For now, return random or 0
    try {
        // Optional: Read from a JSON file if you track stats
        const statsPath = path.join(__dirname, 'user-stats.json');
        if (fs.existsSync(statsPath)) {
            const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
            return stats[userId]?.messageCount || 0;
        }
    } catch (err) {
        console.log('Could not load user stats');
    }
    return 0;
}

/**
 * Setup goodbye message handler
 * @param {Object} sock - Baileys socket connection
 * @param {Object} customConfig - Custom configuration overrides
 */
async function setupGoodbyeMessages(sock, customConfig = {}) {
    
    const config = {
        enabled: true,
        showStats: false,         // Show how many messages they sent (requires tracking)
        showDuration: false,      // Show how long they were in group (requires tracking)
        showQuote: true,          // Show inspirational quote
        showMemberCountUpdate: true, // Show new member count after removal
        showProfilePicture: false,
        emotionalResponse: true,   // Use sad/neutral emojis based on context
        mentionUser: true,         // Tag the leaving user
        ...customConfig
    };

    sock.ev.on('group-participants.update', async (update) => {
        try {
            const { id, participants, action } = update;
            
            // Only handle 'remove' action for goodbye messages
            if (action !== 'remove') return;
            
            // Get group metadata
            const groupMetadata = await sock.groupMetadata(id);
            const groupName = groupMetadata.subject;
            const totalMembers = groupMetadata.participants.length;
            const newMemberCount = totalMembers; // After removal
            
            // Process each leaving member
            for (const participant of participants) {
                // Skip bot's own removal
                if (participant === sock.user.id) continue;
                
                // Get participant info (if available - might be gone already)
                const memberInfo = groupMetadata.participants.find(p => p.id === participant);
                const pushName = memberInfo?.pushName || participant.split('@')[0];
                const shortNumber = participant.split('@')[0];
                
                // Get leave time
                const leaveTime = getFormattedTime();
                const emoji = config.emotionalResponse ? 
                    getRandomGoodbyeEmoji(action) : '👋';
                
                // Try to get profile picture status
                let hasProfilePic = false;
                if (config.showProfilePicture) {
                    const ppUrl = await getUserProfilePicture(sock, participant);
                    hasProfilePic = !!ppUrl;
                }
                
                // Get user stats (if tracking enabled)
                let messageCount = 0;
                let duration = null;
                
                if (config.showStats) {
                    messageCount = getUserMessageCount(participant);
                }
                
                if (config.showDuration) {
                    // You would need to store join dates to calculate this
                    duration = calculateMembershipDuration(null); // Placeholder
                }
                
                // Build goodbye message
                let goodbyeMessage = `┏━━━━━━━━━━━━━━━━━━━┓\n`;
                goodbyeMessage += `┃  ${emoji} **MEMBER LEFT** ${emoji}\n`;
                goodbyeMessage += `┗━━━━━━━━━━━━━━━━━━━┛\n\n`;
                
                goodbyeMessage += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                goodbyeMessage += `👋 **${pushName}** has left the group\n`;
                goodbyeMessage += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
                
                // Tag the user
                if (config.mentionUser) {
                    goodbyeMessage += `👤 **User:** @${shortNumber}\n`;
                }
                
                // Show member count update
                if (config.showMemberCountUpdate) {
                    const oldCount = newMemberCount + 1;
                    goodbyeMessage += `📊 **Member Count:** ${oldCount} → ${newMemberCount}\n`;
                }
                
                // Show stats if available
                if (config.showStats && messageCount > 0) {
                    goodbyeMessage += `💬 **Messages Sent:** ${messageCount}\n`;
                }
                
                // Show duration if available
                if (config.showDuration && duration) {
                    goodbyeMessage += `⏱️ **Membership Duration:** ${duration}\n`;
                }
                
                // Show leave time
                goodbyeMessage += `⏰ **Left at:** ${leaveTime}\n`;
                
                // Show profile picture status
                if (config.showProfilePicture) {
                    goodbyeMessage += `🖼️ **Profile Picture:** ${hasProfilePic ? 'Yes' : 'No'}\n`;
                }
                
                goodbyeMessage += `\n`;
                
                // Add inspirational quote
                if (config.showQuote) {
                    goodbyeMessage += `━━━━━━━━━━━━━━━━━━━\n`;
                    goodbyeMessage += `💭 **PARTING WORDS** 💭\n`;
                    goodbyeMessage += `━━━━━━━━━━━━━━━━━━━\n`;
                    goodbyeMessage += `${getRandomGoodbyeQuote()}\n\n`;
                }
                
                // Add footer based on removal reason
                goodbyeMessage += `━━━━━━━━━━━━━━━━━━━\n`;
                if (action === 'remove') {
                    goodbyeMessage += `🔴 **Type:** Left voluntarily / Removed\n`;
                }
                goodbyeMessage += `━━━━━━━━━━━━━━━━━━━\n\n`;
                
                goodbyeMessage += `🏁 You'll be missed in **${groupName}**! 🏁\n`;
                goodbyeMessage += `⚽ May your football journey continue! ⚽`;
                
                // Send the goodbye message
                await sock.sendMessage(id, {
                    text: goodbyeMessage,
                    mentions: config.mentionUser ? [participant] : []
                });
                
                console.log(`👋 Goodbye message sent for ${pushName} in ${groupName}`);
            }
            
        } catch (error) {
            console.error('Error in goodbye message handler:', error);
        }
    });
}

/**
 * Simple version - Just the essentials
 */
async function setupSimpleGoodbye(sock) {
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        if (action !== 'remove') return;
        
        const groupMetadata = await sock.groupMetadata(id);
        const totalMembers = groupMetadata.participants.length;
        
        for (const participant of participants) {
            if (participant === sock.user.id) continue;
            
            const memberInfo = groupMetadata.participants.find(p => p.id === participant);
            const name = memberInfo?.pushName || 'A member';
            const shortNumber = participant.split('@')[0];
            
            const message = `👋 **Goodbye!** 👋\n\n` +
                `@${shortNumber} (${name}) has left.\n\n` +
                `📊 **Remaining members:** ${totalMembers}\n` +
                `⏰ Left at: ${getFormattedTime()}\n\n` +
                `🎯 You'll be missed!`;
            
            await sock.sendMessage(id, {
                text: message,
                mentions: [participant]
            });
        }
    });
}

/**
 * Dramatic goodbye for admins/kicks
 */
async function setupDramaticGoodbye(sock) {
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        if (action !== 'remove') return;
        
        const groupMetadata = await sock.groupMetadata(id);
        
        for (const participant of participants) {
            if (participant === sock.user.id) continue;
            
            const memberInfo = groupMetadata.participants.find(p => p.id === participant);
            const name = memberInfo?.pushName || participant.split('@')[0];
            
            // Check if user was admin (if we had that info before they left)
            const wasAdmin = memberInfo?.admin === 'admin' || memberInfo?.admin === 'superadmin';
            
            let message = '';
            if (wasAdmin) {
                message = `🔱 **AN ADMIN HAS DEPARTED** 🔱\n\n` +
                    `👑 ${name} (Admin) has left the group!\n\n` +
                    `📜 An era ends. The group will remember their leadership.\n\n` +
                    `🌟 May their legacy live on! 🌟`;
            } else {
                message = `💔 **FAREWELL** 💔\n\n` +
                    `🌸 ${name} has left us.\n\n` +
                    `🎵 *"Every goodbye is a new beginning..."* 🎵\n\n` +
                    `🌈 Wishing you all the best on your journey!`;
            }
            
            await sock.sendMessage(id, { text: message });
        }
    });
}

module.exports = {
    setupGoodbyeMessages,
    setupSimpleGoodbye,
    setupDramaticGoodbye,
    getFormattedTime,
    getRandomGoodbyeQuote,
    calculateMembershipDuration
};
