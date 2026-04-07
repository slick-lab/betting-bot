// livescore.js
// Fetches live scores from Football-Data.org API
// Uses your provided API key: c2a7da9e08d745fc9c763999f1ecac09

const axios = require('axios');

// API Configuration
const FOOTBALL_DATA_API = {
    baseURL: 'https://api.football-data.org/v4',
    token: 'c2a7da9e08d745fc9c763999f1ecac09',
    headers: {
        'X-Auth-Token': 'c2a7da9e08d745fc9c763999f1ecac09'
    }
};

// Competition IDs for filtering (optional)
const COMPETITIONS = {
    'PL': { id: 2021, name: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    'CL': { id: 2001, name: '🏆 UEFA Champions League', emoji: '🏆' },
    'BL1': { id: 2002, name: '🇩🇪 Bundesliga', emoji: '🇩🇪' },
    'DED': { id: 2003, name: '🇳🇱 Eredivisie', emoji: '🇳🇱' },
    'PD': { id: 2014, name: '🇪🇸 La Liga', emoji: '🇪🇸' },
    'SA': { id: 2019, name: '🇮🇹 Serie A', emoji: '🇮🇹' },
    'FL1': { id: 2015, name: '🇫🇷 Ligue 1', emoji: '🇫🇷' },
    'PPL': { id: 2013, name: '🇵🇹 Primeira Liga', emoji: '🇵🇹' },
    'WC': { id: 2000, name: '🌍 FIFA World Cup', emoji: '🌍' },
    'EC': { id: 2018, name: '🏆 UEFA European Championship', emoji: '🏆' }
};

// Status mappings
const STATUS_MAPPING = {
    'IN_PLAY': '🟢 LIVE',
    'PAUSED': '⏸️ PAUSED',
    'LIVE': '🟢 LIVE',
    'HALF_TIME': '⏸️ HALF TIME',
    'EXTRA_TIME': '⏰ EXTRA TIME',
    'PENALTY_SHOOTOUT': '⚽ PENALTIES',
    'FINISHED': '✅ FINISHED',
    'SCHEDULED': '📅 SCHEDULED',
    'POSTPONED': '⏰ POSTPONED',
    'CANCELLED': '❌ CANCELLED',
    'SUSPENDED': '⚠️ SUSPENDED'
};

/**
 * Fetch live matches from API
 * @param {String} status - Match status (LIVE, SCHEDULED, FINISHED, etc.)
 * @returns {Promise<Object>} - API response
 */
async function fetchLiveMatches(status = 'LIVE') {
    try {
        const url = `${FOOTBALL_DATA_API.baseURL}/matches?status=${status}`;
        console.log(`📡 Fetching live scores from: ${url}`);
        
        const response = await axios.get(url, {
            headers: FOOTBALL_DATA_API.headers,
            timeout: 10000
        });
        
        return response.data;
    } catch (error) {
        console.error('Error fetching live matches:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Fetch matches for a specific competition
 * @param {String} competitionCode - Competition code (PL, SA, PD, etc.)
 * @param {String} status - Match status
 * @returns {Promise<Object>} - API response
 */
async function fetchCompetitionMatches(competitionCode, status = 'LIVE') {
    try {
        const competition = COMPETITIONS[competitionCode];
        if (!competition) {
            throw new Error(`Invalid competition code: ${competitionCode}`);
        }
        
        const url = `${FOOTBALL_DATA_API.baseURL}/competitions/${competition.id}/matches?status=${status}`;
        console.log(`📡 Fetching ${competition.name} matches from: ${url}`);
        
        const response = await axios.get(url, {
            headers: FOOTBALL_DATA_API.headers,
            timeout: 10000
        });
        
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${competitionCode} matches:`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Format a single match for WhatsApp display
 * @param {Object} match - Match object from API
 * @returns {String} - Formatted match string
 */
function formatMatch(match) {
    const homeTeam = match.homeTeam?.name || 'TBD';
    const awayTeam = match.awayTeam?.name || 'TBD';
    const homeScore = match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? '-';
    const awayScore = match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? '-';
    const status = match.status || 'SCHEDULED';
    const statusEmoji = STATUS_MAPPING[status] || '⚽';
    
    // Get minute if live
    let minute = '';
    if (status === 'IN_PLAY' && match.minute) {
        minute = ` (${match.minute}')`;
    } else if (status === 'HALF_TIME') {
        minute = ' (HT)';
    } else if (status === 'EXTRA_TIME') {
        minute = ' (ET)';
    }
    
    // Format based on status
    if (status === 'IN_PLAY' || status === 'LIVE') {
        return `${statusEmoji} *${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}*${minute}`;
    } else if (status === 'FINISHED') {
        return `✅ *${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}* (FT)`;
    } else if (status === 'SCHEDULED') {
        const date = new Date(match.utcDate);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        return `📅 ${formattedDate}\n   ${homeTeam} vs ${awayTeam}`;
    } else {
        return `${statusEmoji} ${homeTeam} vs ${awayTeam} (${status})`;
    }
}

/**
 * Send live scores for all matches
 * @param {Object} sock - Baileys socket
 * @param {String} chatId - Chat ID to send to
 * @param {String} status - Match status filter (default: LIVE)
 */
async function sendLiveScores(sock, chatId, status = 'LIVE') {
    try {
        // Send initial message
        await sock.sendMessage(chatId, { 
            text: `🔍 *Fetching ${status === 'LIVE' ? 'live scores' : 'matches'}...*\n⏳ Please wait...` 
        });
        
        const data = await fetchLiveMatches(status);
        
        if (!data.matches || data.matches.length === 0) {
            const noMatchesMsg = status === 'LIVE' 
                ? `🟢 *No Live Matches Currently*\n\n` +
                  `📋 There are no ${status === 'LIVE' ? 'live matches' : 'matches'} at the moment.\n\n` +
                  `💡 Try:\n` +
                  `• /livescore all - See today's schedule\n` +
                  `• /livescore finished - Recent results\n` +
                  `• /livescore pl - Specific league`
                : `📭 *No ${status} matches found*\n\nTry another status or check back later!`;
            
            await sock.sendMessage(chatId, { text: noMatchesMsg });
            return;
        }
        
        // Group matches by competition
        const matchesByComp = {};
        for (const match of data.matches) {
            const compName = match.competition?.name || 'Other';
            if (!matchesByComp[compName]) {
                matchesByComp[compName] = [];
            }
            matchesByComp[compName].push(match);
        }
        
        // Build message
        let message = `⚽ *LIVE SCORES* ⚽\n`;
        message += `━━━━━━━━━━━━━━━━━━━\n`;
        message += `📊 Status: ${status === 'LIVE' ? '🟢 LIVE MATCHES' : status}\n`;
        message += `🕐 Time: ${new Date().toLocaleString()}\n`;
        message += `━━━━━━━━━━━━━━━━━━━\n\n`;
        
        let matchCount = 0;
        let currentMessage = message;
        
        for (const [compName, matches] of Object.entries(matchesByComp)) {
            const compEmoji = getCompetitionEmoji(compName);
            const compHeader = `\n${compEmoji} *${compName}*\n`;
            
            if ((currentMessage + compHeader).length > 3800 && matchCount > 0) {
                await sock.sendMessage(chatId, { text: currentMessage });
                currentMessage = `⚽ *LIVE SCORES* (continued) ⚽\n━━━━━━━━━━━━━━━━━━━\n\n`;
                matchCount = 0;
            }
            
            currentMessage += compHeader;
            
            for (const match of matches) {
                const formattedMatch = formatMatch(match);
                const matchText = `   ${formattedMatch}\n`;
                
                if ((currentMessage + matchText).length > 3800) {
                    await sock.sendMessage(chatId, { text: currentMessage });
                    currentMessage = `⚽ *LIVE SCORES* (continued) ⚽\n━━━━━━━━━━━━━━━━━━━\n\n`;
                    currentMessage += compHeader;
                }
                
                currentMessage += matchText;
                matchCount++;
            }
        }
        
        // Add footer
        currentMessage += `\n━━━━━━━━━━━━━━━━━━━\n`;
        currentMessage += `📌 Commands:\n`;
        currentMessage += `• /livescore - Live matches\n`;
        currentMessage += `• /livescore all - Today's schedule\n`;
        currentMessage += `• /livescore pl - Premier League\n`;
        currentMessage += `• /livescore sa - Serie A\n`;
        currentMessage += `• /livescore pd - La Liga\n`;
        currentMessage += `• /livescore finished - Recent results\n`;
        currentMessage += `⚽ /predictions - AI predictions`;
        
        await sock.sendMessage(chatId, { text: currentMessage });
        
    } catch (error) {
        console.error('Error in sendLiveScores:', error);
        await sock.sendMessage(chatId, { 
            text: `❌ *Error fetching live scores*\n\n` +
                  `Unable to connect to football API.\n` +
                  `Possible issues:\n` +
                  `• API rate limit reached (10 requests/min)\n` +
                  `• Network connectivity issue\n` +
                  `• Invalid API token\n\n` +
                  `💡 Try again in a minute.` 
        });
    }
}

/**
 * Send matches for a specific competition
 * @param {Object} sock - Baileys socket
 * @param {String} chatId - Chat ID
 * @param {String} competitionCode - Competition code
 * @param {String} status - Match status
 */
async function sendCompetitionMatches(sock, chatId, competitionCode, status = 'LIVE') {
    try {
        const competition = COMPETITIONS[competitionCode.toUpperCase()];
        if (!competition) {
            const available = Object.keys(COMPETITIONS).map(code => `• /livescore ${code.toLowerCase()}`).join('\n');
            await sock.sendMessage(chatId, {
                text: `❌ *Invalid competition code*\n\n` +
                      `Available codes:\n${available}\n\n` +
                      `Example: /livescore pl`
            });
            return;
        }
        
        await sock.sendMessage(chatId, { 
            text: `🔍 Fetching ${competition.name} ${status === 'LIVE' ? 'live scores' : 'matches'}...` 
        });
        
        const data = await fetchCompetitionMatches(competitionCode.toUpperCase(), status);
        
        if (!data.matches || data.matches.length === 0) {
            await sock.sendMessage(chatId, {
                text: `📭 *No ${status === 'LIVE' ? 'live' : status.toLowerCase()} matches found*\n` +
                      `for ${competition.name}\n\n` +
                      `💡 Try /livescore ${competitionCode.toLowerCase()} all for schedule`
            });
            return;
        }
        
        // Build message
        let message = `⚽ *${competition.name}* ⚽\n`;
        message += `━━━━━━━━━━━━━━━━━━━\n`;
        message += `📊 Status: ${status === 'LIVE' ? '🟢 LIVE' : status}\n`;
        message += `━━━━━━━━━━━━━━━━━━━\n\n`;
        
        for (const match of data.matches) {
            message += `${formatMatch(match)}\n`;
        }
        
        message += `\n━━━━━━━━━━━━━━━━━━━\n`;
        message += `📌 /livescore - All live matches\n`;
        message += `⚽ /predictions - AI predictions`;
        
        await sock.sendMessage(chatId, { text: message });
        
    } catch (error) {
        console.error(`Error in sendCompetitionMatches for ${competitionCode}:`, error);
        await sock.sendMessage(chatId, {
            text: `❌ Error fetching ${competitionCode.toUpperCase()} matches.\n` +
                  `Please try again later.`
        });
    }
}

/**
 * Helper: Get emoji for competition
 */
function getCompetitionEmoji(compName) {
    if (compName.includes('Premier League')) return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
    if (compName.includes('La Liga')) return '🇪🇸';
    if (compName.includes('Serie A')) return '🇮🇹';
    if (compName.includes('Bundesliga')) return '🇩🇪';
    if (compName.includes('Ligue 1')) return '🇫🇷';
    if (compName.includes('Champions League')) return '🏆';
    if (compName.includes('World Cup')) return '🌍';
    return '⚽';
}

/**
 * Command handler for live scores
 * @param {Object} sock - Baileys socket
 * @param {String} message - Command message
 * @param {String} chatId - Chat ID
 */
async function handleLiveScoreCommand(sock, message, chatId) {
    const args = message.toLowerCase().split(' ');
    const command = args[0];
    const param = args[1];
    
    if (command === '/livescore' || command === '/live') {
        // No parameters - show live matches
        if (!param) {
            await sendLiveScores(sock, chatId, 'LIVE');
        }
        // Specific league
        else if (COMPETITIONS[param.toUpperCase()]) {
            await sendCompetitionMatches(sock, chatId, param, 'LIVE');
        }
        // All matches today
        else if (param === 'all' || param === 'today') {
            await sendLiveScores(sock, chatId, 'SCHEDULED');
        }
        // Finished matches
        else if (param === 'finished' || param === 'results') {
            await sendLiveScores(sock, chatId, 'FINISHED');
        }
        // Help
        else if (param === 'help') {
            const helpMsg = `📋 *Live Score Commands*\n\n` +
                `• /livescore - Live matches\n` +
                `• /livescore all - Today's schedule\n` +
                `• /livescore finished - Recent results\n` +
                `• /livescore pl - Premier League\n` +
                `• /livescore sa - Serie A\n` +
                `• /livescore pd - La Liga\n` +
                `• /livescore bl1 - Bundesliga\n` +
                `• /livescore cl - Champions League\n` +
                `• /livescore help - This menu\n\n` +
                `⚽ /predictions - AI predictions`;
            
            await sock.sendMessage(chatId, { text: helpMsg });
        }
        // Invalid parameter
        else {
            await sock.sendMessage(chatId, {
                text: `❌ Unknown parameter: ${param}\n\n` +
                      `📋 Try:\n` +
                      `• /livescore - Live matches\n` +
                      `• /livescore all - Today's schedule\n` +
                      `• /livescore pl - Premier League\n` +
                      `• /livescore help - All commands`
            });
        }
    }
}

// Export functions
module.exports = {
    handleLiveScoreCommand,
    sendLiveScores,
    sendCompetitionMatches,
    fetchLiveMatches,
    fetchCompetitionMatches,
    COMPETITIONS,
    STATUS_MAPPING
};
