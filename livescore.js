// livescore.js - Professional Live Scores (Football + Basketball)
const axios = require('axios');

// Football API Configuration (Your key)
const FOOTBALL_API = {
    url: 'https://api.football-data.org/v4',
    token: 'c2a7da9e08d745fc9c763999f1ecac09',
    headers: { 'X-Auth-Token': 'c2a7da9e08d745fc9c763999f1ecac09' }
};

// Basketball API (Free, no key)
const BASKETBALL_API = 'https://www.balldontlie.io/api/v1';

// Competition names mapping
const COMPETITIONS = {
    'PL': '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League',
    'PD': '🇪🇸 La Liga',
    'SA': '🇮🇹 Serie A',
    'BL1': '🇩🇪 Bundesliga',
    'FL1': '🇫🇷 Ligue 1',
    'CL': '🏆 Champions League',
    'EL': '🏆 Europa League'
};

// Status emojis
const STATUS = {
    'LIVE': '🟢',
    'IN_PLAY': '🟢',
    'PAUSED': '⏸️',
    'HALF_TIME': '⏸️',
    'FINISHED': '✅',
    'SCHEDULED': '📅',
    'POSTPONED': '⏰',
    'CANCELLED': '❌'
};

/**
 * Get current time
 */
function getTime() {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Fetch live football matches
 */
async function getLiveFootball() {
    try {
        const response = await axios.get(`${FOOTBALL_API.url}/matches`, {
            headers: FOOTBALL_API.headers,
            params: { status: 'LIVE' },
            timeout: 10000
        });
        return response.data.matches || [];
    } catch (error) {
        console.error('Football API error:', error.message);
        return [];
    }
}

/**
 * Fetch live basketball matches
 */
async function getLiveBasketball() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await axios.get(`${BASKETBALL_API}/games`, {
            params: { dates: [today], per_page: 50 },
            timeout: 10000
        });
        
        // Filter live games (status = 'Live')
        return response.data.data.filter(game => game.status === 'Live');
    } catch (error) {
        console.error('Basketball API error:', error.message);
        return [];
    }
}

/**
 * Format football match
 */
function formatFootballMatch(match) {
    const home = match.homeTeam?.name || '?';
    const away = match.awayTeam?.name || '?';
    const homeScore = match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? '-';
    const awayScore = match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? '-';
    const status = match.status || 'LIVE';
    const emoji = STATUS[status] || '⚽';
    const competition = COMPETITIONS[match.competition?.code] || match.competition?.name || 'Football';
    
    let minute = '';
    if (match.minute) minute = ` (${match.minute}')`;
    else if (status === 'HALF_TIME') minute = ' (HT)';
    
    return `${emoji} *${home} ${homeScore} - ${awayScore} ${away}*${minute}\n   📋 ${competition}`;
}

/**
 * Format basketball match
 */
function formatBasketballMatch(game) {
    const home = game.home_team?.full_name || game.home_team?.name || '?';
    const away = game.visitor_team?.full_name || game.visitor_team?.name || '?';
    const homeScore = game.home_team_score ?? '-';
    const awayScore = game.visitor_team_score ?? '-';
    const period = game.period || 0;
    const time = game.time || '';
    
    let statusText = '🟢 LIVE';
    if (period > 0 && period <= 4) statusText = `🟢 Q${period}`;
    if (time) statusText += ` ${time}`;
    
    return `${statusText} *${home} ${homeScore} - ${awayScore} ${away}*`;
}

/**
 * Send live scores to WhatsApp
 */
async function sendLiveScores(sock, chatId) {
    await sock.sendMessage(chatId, { text: '🔍 Fetching live scores...' });
    
    const [footballMatches, basketballGames] = await Promise.all([
        getLiveFootball(),
        getLiveBasketball()
    ]);
    
    const hasFootball = footballMatches.length > 0;
    const hasBasketball = basketballGames.length > 0;
    
    if (!hasFootball && !hasBasketball) {
        await sock.sendMessage(chatId, { 
            text: '🟢 *No live matches at the moment*\n\n📅 Check back during match hours:\n• Football: Weekends, 3pm-10pm\n• NBA: Night (Nigeria time)\n\nUse /fixtures for upcoming games'
        });
        return;
    }
    
    let message = `⚽ *LIVE SCORES* 🏀\n📡 ${getTime()}\n━━━━━━━━━━━━━━━━━━━\n`;
    
    if (hasFootball) {
        message += `\n⚽ *FOOTBALL*\n`;
        for (const match of footballMatches.slice(0, 8)) {
            message += `\n${formatFootballMatch(match)}`;
        }
    }
    
    if (hasBasketball) {
        message += `\n\n🏀 *BASKETBALL*\n`;
        for (const game of basketballGames.slice(0, 6)) {
            message += `\n${formatBasketballMatch(game)}`;
        }
    }
    
    message += `\n\n━━━━━━━━━━━━━━━━━━━\n🔄 Updates every 30 seconds\n📋 /livescore - Refresh\n⚽ /fixtures - Upcoming games`;
    
    await sock.sendMessage(chatId, { text: message });
}

/**
 * Send specific league live scores
 */
async function sendLeagueLive(sock, chatId, leagueCode) {
    const matches = await getLiveFootball();
    const leagueMatches = matches.filter(m => m.competition?.code === leagueCode.toUpperCase());
    
    if (leagueMatches.length === 0) {
        await sock.sendMessage(chatId, { text: `📭 No live matches in ${COMPETITIONS[leagueCode.toUpperCase()] || leagueCode} right now` });
        return;
    }
    
    let message = `⚽ *${COMPETITIONS[leagueCode.toUpperCase()] || leagueCode}* ⚽\n📡 ${getTime()}\n━━━━━━━━━━━━━━━━━━━\n`;
    
    for (const match of leagueMatches) {
        message += `\n${formatFootballMatch(match)}`;
    }
    
    await sock.sendMessage(chatId, { text: message });
}

/**
 * Main command handler
 */
async function handleLiveScoreCommand(sock, messageText, chatId) {
    const args = messageText.toLowerCase().split(' ');
    const command = args[0];
    const param = args[1];
    
    if (command === '/livescore' || command === '/live') {
        if (!param) {
            await sendLiveScores(sock, chatId);
        } else if (param === 'pl' || param === 'premier-league') {
            await sendLeagueLive(sock, chatId, 'PL');
        } else if (param === 'laliga' || param === 'pd') {
            await sendLeagueLive(sock, chatId, 'PD');
        } else if (param === 'seriea' || param === 'sa') {
            await sendLeagueLive(sock, chatId, 'SA');
        } else if (param === 'bundesliga' || param === 'bl1') {
            await sendLeagueLive(sock, chatId, 'BL1');
        } else if (param === 'ucl' || param === 'champions-league') {
            await sendLeagueLive(sock, chatId, 'CL');
        } else if (param === 'help') {
            await sock.sendMessage(chatId, {
                text: `📋 *Live Score Commands*\n\n/livescore - All live matches\n/livescore pl - Premier League\n/livescore laliga - La Liga\n/livescore seriea - Serie A\n/livescore bundesliga - Bundesliga\n/livescore ucl - Champions League\n\n🏀 Basketball coming soon!`
            });
        } else {
            await sendLiveScores(sock, chatId);
        }
    }
}

module.exports = { handleLiveScoreCommand, sendLiveScores };
