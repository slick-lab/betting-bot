// goodbyemsg.js

/**
 * Get formatted leave time
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
 * Get random goodbye message
 */
function getRandomGoodbye() {
    const messages = [
        '💔 Sorry to see you go!',
        '👋 Take care out there!',
        '🌟 You\'ll be missed!',
        '🏃 Thanks for stopping by!',
        '💫 Until we meet again!',
        '🍀 Good luck on your journey!',
        '🌈 Wishing you the best!',
        '⭐ The door is always open!'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Setup goodbye message handler
 */
async function setupGoodbyeMessages(sock) {
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        if (action !== 'remove') return;
        
        const groupMetadata = await sock.groupMetadata(id);
        const groupName = groupMetadata.subject;
        const totalMembers = groupMetadata.participants.length;
        
        for (const participant of participants) {
            if (participant === sock.user.id) continue;
            
            const memberInfo = groupMetadata.participants.find(p => p.id === participant);
            const pushName = memberInfo?.pushName || participant.split('@')[0];
            const shortNumber = participant.split('@')[0];
            const leaveTime = getFormattedTime();
            const randomMsg = getRandomGoodbye();
            
            let message = `👋 *GOODBYE* 👋\n\n`;
            message += `✨ ${pushName}\n`;
            message += `📱 @${shortNumber}\n`;
            message += `⏰ Left at: ${leaveTime}\n`;
            message += `👥 Members left: ${totalMembers}\n\n`;
            message += `${randomMsg}\n\n`;
            message += `🌸 Farewell from ${groupName}!`;
            
            await sock.sendMessage(id, {
                text: message,
                mentions: [participant]
            });
            
            console.log(`👋 Goodbye sent for ${pushName} from ${groupName}`);
        }
    });
}

module.exports = { setupGoodbyeMessages };
