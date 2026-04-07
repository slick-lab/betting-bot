// fixtures.js
// Fetches football fixtures from public APIs (no API key required)
// Covers England, UEFA, FIFA, Italy, Spain

const axios = require('axios');

// Multiple free/public API endpoints
const API_SOURCES = {
    // TheSportsDB - Free, no API key required for basic endpoints
    thesportsdb: 'https://www.thesportsdb.com/api/v1/json/3',
    
    // Fixtures.net - Public endpoint (limited but works)
    fixturesnet: 'https://fixtures.net/api/fixtures',
    
    // Football-Data.org has a free tier but needs API key - skipping
    // Using alternative public sources instead
};

// League IDs and mappings
const LEAGUES = {
    // England
    'premier-league': {
        name: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League',
        country: 'England',
        thesportsdb_id: '4328',
        priority: 1
    },
    'championship': {
        name: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Championship',
        country: 'England',
        thesportsdb_id: '4332',
        priority: 2
    },
    'fa-cup': {
        name: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 FA Cup',
        country: 'England',
        thesportsdb_id: '4480',
        priority: 3
    },
    
    // Spain
    'laliga': {
        name: '🇪🇸 La Liga',
        country: 'Spain',
        thesportsdb_id: '4335',
        priority: 1
    },
    'copa-del-rey': {
        name: '🇪🇸 Copa del Rey',
        country: 'Spain',
        thesportsdb_id: '4495',
        priority: 2
    },
    
    // Italy
    'serie-a': {
        name: '🇮🇹 Serie A',
        country: 'Italy',
        thesportsdb_id: '4337',
        priority: 1
    },
    'coppa-italia': {
        name: '🇮🇹 Coppa Italia',
        country: 'Italy',
        thesportsdb_id: '4490',
        priority: 2
    },
    
    // UEFA
    'uefa-champions-league': {
        name: '🏆 UEFA Champions League',
        country: 'Europe',
        thesportsdb_id: '4496',
        priority: 1
    },
    'uefa-europa-league': {
        name: '🏆 UEFA Europa League',
        country: 'Europe',
        thesportsdb_id: '4502',
        priority: 2
    },
    'uefa-conference-league': {
        name: '🏆 UEFA Conference League',
        country: 'Europe',
        thesportsdb_id: '4503',
        priority: 3
    },
    
    // FIFA
    'fifa-world-cup': {
        name: '🌍 FIFA World Cup',
        country: 'International',
        thesportsdb_id: '4387',
        priority: 1
    },
    'fifa-world-cup-qualifiers': {
        name: '🌍 FIFA World Cup Qualifiers',
        country: 'International',
        thesportsdb_id: '4421',
        priority: 2
    }
};

/**
 * Fetch fixtures from TheSportsDB (no API key required)
 * @param {String} leagueId - TheSportsDB league ID
 * @returns {Promise<Array>} - List of fixtures
 */
async function fetchFromTheSportsDB(leagueId) {
    try {
        // Get current date and next 7 days
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };
        
        // Try to get events by league ID (all upcoming)
        const url = `${API_SOURCES.thesportsdb}/eventsnextleague.php?id=${leagueId}`;
        console.log(`Fetching from: ${url}`);
        
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'WhatsAppFootballBot/1.0'
            }
        });
        
        if (response.data && response.data.events) {
            return response.data.events;
        }
        
        return [];
    } catch (error) {
        console.error(`Error fetching from TheSportsDB for league ${leagueId}:`, error.message);
        return [];
    }
}

/**
 * Alternative: Fetch from public fixtures API
 * @returns {Promise<Array>} - List of fixtures
 */
async function fetchFromPublicAPI() {
    try {
        // Using a public CORS proxy to access some free football data
        const response = await axios.get('https://cdn.jsdelivr.net/gh/arsi-apli/Football-API/fixtures.json', {
            timeout: 8000,
            headers: {
                'User-Agent': 'WhatsAppFootballBot/1.0'
            }
        });
        
        if (response.data && response.data.fixtures) {
            return response.data.fixtures;
        }
        return [];
    } catch (error) {
        console.error('Error fetching from public API:', error.message);
        return [];
    }
}

/**
 * Format fixture for WhatsApp message
 * @param {Object} fixture - Fixture data
 * @returns {String} - Formatted fixture string
 */
function formatFixture(fixture) {
    let dateStr = fixture.dateEvent || fixture.strTimestamp || fixture.date;
    let timeStr = fixture.strTime || '';
    let homeTeam = fixture.strHomeTeam || fixture.homeTeam || 'TBD';
    let awayTeam = fixture.strAwayTeam || fixture.awayTeam || 'TBD';
    let leagueName = fixture.strLeague || fixture.league || 'Football';
    let status = fixture.strStatus || fixture.status || '';
    
    // Format date nicely
    let formattedDate = 'Date TBD';
    if (dateStr) {
        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });
                if (timeStr) {
                    formattedDate += ` @ ${timeStr}`;
                }
            }
        } catch (e) {
            formattedDate = dateStr;
        }
    }
    
    // Different formatting based on status
    if (status === 'FT' || status === 'Match Finished') {
        const homeScore = fixture.intHomeScore || fixture.homeScore || '?';
        const awayScore = fixture.intAwayScore || fixture.awayScore || '?';
        return `✅ *${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}* (FT)`;
    } else if (status === 'Live' || status === 'In Progress') {
        const homeScore = fixture.intHomeScore || fixture.homeScore || '0';
        const awayScore = fixture.intAwayScore || fixture.awayScore || '0';
        return `🟢 *LIVE:* ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`;
    } else {
        return `📅 ${formattedDate}\n   ${homeTeam} vs ${awayTeam}`;
    }
}

/**
 * Get fixtures for a specific league
 * @param {Object} sock - Baileys socket
 * @param {String} leagueKey - League key from LEAGUES object
 * @param {String} chatId - Chat ID to send to
 * @returns {Promise<Boolean>} - Success status
 */
async function getLeagueFixtures(sock, leagueKey, chatId) {
    const league = LEAGUES[leagueKey];
    if (!league) {
        await sock.sendMessage(chatId, { text: `❌ League '${leagueKey}' not found!` });
        return false;
    }
    
    await sock.sendMessage(chatId, { text: `🔍 Fetching ${league.name} fixtures...` });
    
    // Try multiple sources
    let fixtures = await fetchFromTheSportsDB(league.thesportsdb_id);
    
    // If no fixtures from primary source, try secondary
    if (!fixtures || fixtures.length === 0) {
        fixtures = await fetchFromPublicAPI();
    }
    
    if (!fixtures || fixtures.length === 0) {
        await sock.sendMessage(chatId, { 
            text: `📭 No upcoming fixtures found for ${league.name}\n\n` +
                  `This could be due to:\n` +
                  `• Off-season / no matches scheduled\n` +
                  `• API limitations (free tier)\n` +
                  `• League temporarily inactive\n\n` +
                  `Try another league or check back later! 🏃`
        });
        return false;
    }
    
    // Format and send fixtures (WhatsApp limit ~4-5 per message)
    let message = `⚽ *${league.name}* ⚽\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n`;
    message += `📆 Upcoming Fixtures:\n\n`;
    
    let fixtureCount = 0;
    let currentMessage = message;
    
    for (const fixture of fixtures.slice(0, 12)) { // Max 12 fixtures
        const formattedFixture = formatFixture(fixture);
        const newFixtureText = `\n${formattedFixture}\n`;
        
        // Check if adding this fixture would exceed WhatsApp limit (~4000 chars)
        if ((currentMessage + newFixtureText).length > 3800 && fixtureCount > 0) {
            await sock.sendMessage(chatId, { text: currentMessage });
            currentMessage = `⚽ *${league.name}* (continued) ⚽\n━━━━━━━━━━━━━━━━━━━\n\n`;
            fixtureCount = 0;
        }
        
        currentMessage += newFixtureText;
        fixtureCount++;
    }
    
    if (currentMessage !== message) {
        currentMessage += `\n━━━━━━━━━━━━━━━━━━━\n`;
        currentMessage += `📌 Type /fixtures all for all leagues\n`;
        currentMessage += `⚽ Use /predictions for AI match predictions`;
        await sock.sendMessage(chatId, { text: currentMessage });
    }
    
    return true;
}

/**
 * Get all fixtures (main leagues only) - split into multiple messages
 * @param {Object} sock - Baileys socket
 * @param {String} chatId - Chat ID to send to
 */
async function getAllFixtures(sock, chatId) {
    await sock.sendMessage(chatId, { 
        text: `🔍 *Fetching fixtures from all major leagues...*\n` +
              `🏴󠁧󠁢󠁥󠁮󠁧󠁿 🇪🇸 🇮🇹 🏆 🌍\n\n` +
              `⏳ This may take a moment...` 
    });
    
    // Prioritized leagues
    const priorityLeagues = [
        'premier-league', 'laliga', 'serie-a', 
        'uefa-champions-league', 'fifa-world-cup'
    ];
    
    for (const leagueKey of priorityLeagues) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
        await getLeagueFixtures(sock, leagueKey, chatId);
    }
    
    // Send summary
    await sock.sendMessage(chatId, {
        text: `✅ *Fixtures fetch complete!*\n\n` +
              `📌 To see specific leagues:\n` +
              `• /fixtures premier-league\n` +
              `• /fixtures laliga\n` +
              `• /fixtures serie-a\n` +
              `• /fixtures uefa-champions-league\n\n` +
              `🤖 Use /predictions for AI-powered match predictions!`
    });
}

/**
 * List all available leagues
 * @param {Object} sock - Baileys socket
 * @param {String} chatId - Chat ID to send to
 */
async function listLeagues(sock, chatId) {
    let message = `📋 *Available Leagues* 📋\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Group by country
    const byCountry = {};
    for (const [key, league] of Object.entries(LEAGUES)) {
        if (!byCountry[league.country]) {
            byCountry[league.country] = [];
        }
        byCountry[league.country].push({ key, name: league.name });
    }
    
    for (const [country, leagues] of Object.entries(byCountry)) {
        const flag = country === 'England' ? '🏴󠁧󠁢󠁥󠁮󠁧󠁿' :
                     country === 'Spain' ? '🇪🇸' :
                     country === 'Italy' ? '🇮🇹' :
                     country === 'Europe' ? '🏆' :
                     country === 'International' ? '🌍' : '⚽';
        
        message += `${flag} *${country}*\n`;
        for (const league of leagues) {
            message += `   • /fixtures ${league.key.replace(/-/g, '')}\n`;
        }
        message += `\n`;
    }
    
    message += `━━━━━━━━━━━━━━━━━━━\n`;
    message += `💡 *Example:* /fixtures premierleague\n`;
    message += `📌 *All leagues:* /fixtures all\n`;
    message += `⚽ *Predictions:* /predictions`;
    
    await sock.sendMessage(chatId, { text: message });
}

/**
 * Command handler for fixtures
 * @param {Object} sock - Baileys socket
 * @param {String} message - The command message
 * @param {String} chatId - Chat ID
 * @param {String} sender - Sender ID (optional)
 */
async function handleFixturesCommand(sock, message, chatId, sender = null) {
    const args = message.toLowerCase().split(' ');
    
    if (args[0] === '/fixtures' || args[0] === '/fixture') {
        const leagueArg = args[1];
        
        if (!leagueArg) {
            // No league specified - show list
            await listLeagues(sock, chatId);
            return;
        }
        
        if (leagueArg === 'all') {
            await getAllFixtures(sock, chatId);
            return;
        }
        
        // Try to find matching league
        let matchedLeague = null;
        let matchedKey = null;
        
        for (const [key, league] of Object.entries(LEAGUES)) {
            const normalizedKey = key.replace(/-/g, '');
            if (normalizedKey === leagueArg || 
                league.name.toLowerCase().includes(leagueArg) ||
                league.name.toLowerCase().replace(/\s/g, '') === leagueArg) {
                matchedLeague = league;
                matchedKey = key;
                break;
            }
        }
        
        if (matchedLeague && matchedKey) {
            await getLeagueFixtures(sock, matchedKey, chatId);
        } else {
            await sock.sendMessage(chatId, {
                text: `❌ League '${leagueArg}' not found!\n\n` +
                      `📋 Use /fixtures to see all available leagues.`
            });
        }
    }
}

// Export functions
module.exports = {
    handleFixturesCommand,
    getLeagueFixtures,
    getAllFixtures,
    listLeagues,
    LEAGUES,
    formatFixture
};
