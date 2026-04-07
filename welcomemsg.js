// welcomemsg.js
// Advanced welcome message handler with user tagging, profile picture, member count, and join time

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
        return null; // User has no profile picture or privacy settings
    }
}

/**
 * Format time for join message
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
        month: 'short'
    };
    return now.toLocaleString('en-US', options);
}

/**
 * Get random welcome GIF/Sticker suggestion
 * @returns {String} - Random emoji combo
 */
function getRandomWelcomeEmoji() {
    const emojis = ['🎉', '🥳', '🎊', '✨', '🌟', '💫', '⭐', '🔥', '💯', '🤝', '👑', '🏆', '⚽', '🎯', '💪'];
    return emojis[Math.floor(Math.random() * emojis.length)];
}

/**
 * Get group rules from settings
 * @param {String} groupId - Group JID
 * @returns {Array} - Array of rule strings
 */
function getGroupRules(groupId) {
    if (settings.groupRules && settings.groupRules[groupId]) {
        return settings.groupRules[groupId];
    }
    if (settings.defaultRules) {
        return settings.defaultRules;
    }
    // Default rules if none configured
    return [
        '📵 No spam or promotional messages',
        '🤝 Be respectful to all members',
        '⚽ Keep discussions football-related',
        '🚫 No hate speech or racism',
        '🔞 No NSFW content'
    ];
}

/**
 * Setup welcome message handler
 * @param {Object} sock - Baileys socket connection
 * @param {Object} customConfig - Custom configuration overrides
 */
async function setupWelcomeMessages(sock, customConfig = {}) {
    
    const config = {
        enabled: true,
        sendImageWelcome: false, // Set to true if you want to send image/profile picture
        showRules: true,
        showMemberCount: true,
        showJoinTime: true,
        showProfilePicture: false, // Can't directly send image without media upload
        ...customConfig
    };

    sock.ev.on('group-participants.update', async (update) => {
        try {
            const { id, participants, action } = update;
            
            // Only handle 'add' action for welcome messages
            if (action !== 'add') return;
            
            // Get group metadata
            const groupMetadata = await sock.groupMetadata(id);
            const groupName = groupMetadata.subject;
            const totalMembers = groupMetadata.participants.length;
            
            // Process each new member
            for (const participant of participants) {
                // Skip bot's own join
                if (participant === sock.user.id) continue;
                
                // Get participant info
                const memberInfo = groupMetadata.participants.find(p => p.id === participant);
                const pushName = memberInfo?.pushName || participant.split('@')[0];
                const shortNumber = participant.split('@')[0];
                
                // Get current member count (their position number)
                // Find their index in the participants array + 1
                let memberNumber = totalMembers;
                if (memberInfo) {
                    const index = groupMetadata.participants.findIndex(p => p.id === participant);
                    memberNumber = index + 1;
                }
                
                // Get join time
                const joinTime = getFormattedTime();
                const randomEmoji = getRandomWelcomeEmoji();
                
                // Try to get profile picture (optional, for logging)
                let hasProfilePic = false;
                if (config.showProfilePicture) {
                    const ppUrl = await getUserProfilePicture(sock, participant);
                    hasProfilePic = !!ppUrl;
                }
                
                // Get group rules
                const rules = getGroupRules(id);
                
                // Build welcome message
                let welcomeMessage = `┏━━━━━━━━━━━━━━━━━━━┓\n`;
                welcomeMessage += `┃  ${randomEmoji} **NEW MEMBER ALERT** ${randomEmoji}\n`;
                welcomeMessage += `┗━━━━━━━━━━━━━━━━━━━┛\n\n`;
                
                welcomeMessage += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                welcomeMessage += `✨ **${pushName}** just joined!\n`;
                welcomeMessage += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
                
                // Tag the user
                welcomeMessage += `👤 **User:** @${shortNumber}\n`;
                
                // Show member number
                if (config.showMemberCount) {
                    welcomeMessage += `🔢 **Member \#${memberNumber}** of ${totalMembers}\n`;
                }
                
                // Show join time
                if (config.showJoinTime) {
                    welcomeMessage += `⏰ **Joined:** ${joinTime}\n`;
                }
                
                // Show if they have profile picture
                if (config.showProfilePicture && hasProfilePic) {
                    welcomeMessage += `🖼️ **Profile:** Has profile picture\n`;
                } else if (config.showProfilePicture && !hasProfilePic) {
                    welcomeMessage += `🖼️ **Profile:** No profile picture set\n`;
                }
                
                welcomeMessage += `\n`;
                
                // Add group rules
                if (config.showRules && rules.length > 0) {
                    welcomeMessage += `━━━━━━━━━━━━━━━━━━━\n`;
                    welcomeMessage += `📜 **GROUP RULES** 📜\n`;
                    welcomeMessage += `━━━━━━━━━━━━━━━━━━━\n`;
                    rules.forEach((rule, idx) => {
                        welcomeMessage += `${idx + 1}. ${rule}\n`;
                    });
                    welcomeMessage += `\n`;
                }
                
                // Add welcome footer
                welcomeMessage += `━━━━━━━━━━━━━━━━━━━\n`;
                welcomeMessage += `💬 Type **/help** for commands\n`;
                welcomeMessage += `⚽ Use **/predictions** for match predictions\n`;
                welcomeMessage += `📊 Use **/live** for live scores\n`;
                welcomeMessage += `━━━━━━━━━━━━━━━━━━━\n\n`;
                
                welcomeMessage += `🎊 Welcome to **${groupName}**! Enjoy your stay! 🎊`;
                
                // Send the welcome message with user mention
                await sock.sendMessage(id, {
                    text: welcomeMessage,
                    mentions: [participant] // Tag the new user
                });
                
                // Optional: Send a welcome sticker for extra coolness
                try {
                    // Some popular WhatsApp sticker packs for welcome
                    const welcomeStickers = [
                        'CAACAgIAAxkBAAEB', // Add your sticker IDs here
                    ];
                    // Uncomment if you have sticker IDs
                    // await sock.sendMessage(id, { 
                    //     sticker: { url: 'your-sticker-url.webp' } 
                    // });
                } catch (err) {
                    // Sticker sending failed, but main message already sent
                }
                
                console.log(`✅ Welcome message sent to ${pushName} in ${groupName}`);
            }
            
        } catch (error) {
            console.error('Error in welcome message handler:', error);
        }
    });
}

/**
 * Simple version with just the essentials (still cool)
 */
async function setupSimpleWelcome(sock) {
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        if (action !== 'add') return;
        
        const groupMetadata = await sock.groupMetadata(id);
        const totalMembers = groupMetadata.participants.length;
        
        for (const participant of participants) {
            if (participant === sock.user.id) continue;
            
            const memberInfo = groupMetadata.participants.find(p => p.id === participant);
            const name = memberInfo?.pushName || 'New Member';
            const shortNumber = participant.split('@')[0];
            
            // Find member number
            const memberNumber = groupMetadata.participants.findIndex(p => p.id === participant) + 1;
            
            const message = `🎉✨ **WELCOME** ✨🎉\n\n` +
                `@${shortNumber} (${name})\n\n` +
                `You are member **#${memberNumber}** of ${totalMembers}\n` +
                `⏰ Joined at: ${getFormattedTime()}\n\n` +
                `🎊 Enjoy your time here! 🎊`;
            
            await sock.sendMessage(id, {
                text: message,
                mentions: [participant]
            });
        }
    });
}

module.exports = {
    setupWelcomeMessages,
    setupSimpleWelcome,
    getUserProfilePicture,
    getFormattedTime
};
