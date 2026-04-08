// welcomemsg.js

/**
 * Get user's profile picture URL
 */
async function getUserProfilePic(sock, jid) {
    try {
        const ppUrl = await sock.profilePictureUrl(jid, 'image');
        return ppUrl;
    } catch {
        return null;
    }
}

/**
 * Get current time formatted
 */
function getFormattedTime() {
    const now = new Date();
    return now.toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: 'numeric', 
        hour12: true,
        weekday: 'long',
        day: 'numeric',
        month: 'short'
    });
}

/**
 * Get group description/rules
 */
function getGroupDescription(groupMetadata) {
    const desc = groupMetadata.desc || groupMetadata.subjectOwner || '';
    return desc.toString?.() || desc || '';
}

/**
 * Setup welcome message handler
 */
async function setupWelcomeMessages(sock) {
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        if (action !== 'add') return;
        
        // Get fresh group metadata for accurate member count
        const groupMetadata = await sock.groupMetadata(id);
        const groupName = groupMetadata.subject;
        const totalMembers = groupMetadata.participants.length;
        
        for (const participant of participants) {
            if (participant === sock.user.id) continue;
            
            // Get member info
            const memberInfo = groupMetadata.participants.find(p => p.id === participant);
            const pushName = memberInfo?.pushName || participant.split('@')[0];
            const shortNumber = participant.split('@')[0];
            
            // Calculate accurate member number
            const memberNumber = groupMetadata.participants.findIndex(p => p.id === participant) + 1;
            
            // Get join time
            const joinTime = getFormattedTime();
            
            // Try to get profile picture
            const hasProfilePic = !!(await getUserProfilePic(sock, participant).catch(() => null));
            
            // Get group description
            const groupDescription = getGroupDescription(groupMetadata);
            
            // Build welcome message
            let message = `┏━━━━━━━━━━━━━━━━━━━┓\n`;
            message += `┃  🎉 *WELCOME* 🎉\n`;
            message += `┗━━━━━━━━━━━━━━━━━━━┛\n\n`;
            message += `✨ *${pushName}* just joined!\n`;
            message += `👤 @${shortNumber}\n`;
            message += `🔢 Member #${memberNumber} of ${totalMembers}\n`;
            message += `⏰ Joined: ${joinTime}\n`;
            message += `${hasProfilePic ? '🖼️ Has profile picture ✓\n' : ''}\n`;
            
            // Add group description if it exists
            if (groupDescription && groupDescription.trim()) {
                message += `━━━━━━━━━━━━━━━━━━━\n`;
                message += `📜 *GROUP INFO*\n`;
                message += `━━━━━━━━━━━━━━━━━━━\n`;
                message += `${groupDescription}\n\n`;
            }
            
            message += `━━━━━━━━━━━━━━━━━━━\n`;
            message += `🎊 Welcome to ${groupName}! 🎊`;
            
            // Send message with mention
            await sock.sendMessage(id, {
                text: message,
                mentions: [participant]
            });
            
            console.log(`✅ Welcome sent to ${pushName} in ${groupName} (Member #${memberNumber}/${totalMembers})`);
        }
    });
}

module.exports = { setupWelcomeMessages };
