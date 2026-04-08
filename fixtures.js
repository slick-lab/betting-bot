// fixtures.js - Football + Basketball fixtures from top leagues
const axios = require('axios');

// Football API (Football-Data.org)
const FOOTBALL_API = {
    url: 'https://api.football-data.org/v4',
    token: 'c2a7da9e08d745fc9c763999f1ecac09',
    headers: { 'X-Auth-Token': 'c2a7da9e08d745fc9c763999f1ecac09' }
};

// Football Leagues (Top competitions only)
const FOOTBALL_LEAGUES = {
    'premier-league': {
        name: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League',
        code: 'PL',
        priority: 1,
        emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
    },
    'laliga': {
        name: '🇪🇸 La Liga',
        code: 'PD',
        priority: 1,
        emoji: '🇪🇸'
    },
    'serie-a': {
        name: '🇮🇹 Serie A',
        code: 'SA',
        priority: 1,
        emoji: '🇮🇹'
    },
    'bundesliga': {
        name: '🇩🇪 Bundesliga',
        code: 'BL1',
        priority: 1,
        emoji: '🇩🇪'
    },
    'ligue-1': {
        name: '🇫🇷 Ligue 1',
        code: 'FL1',
        priority: 2,
        emoji: '🇫🇷'
    },
    'uefa-champions-league': {
        name: '🏆 UEFA Champions League',
        code: 'CL',
        priority: 1,
        emoji: '🏆'
    },
    'uefa-europa-league': {
        name: '🏆 UEFA Europa League',
        code: 'EL',
        priority: 2,
        emoji: '🏆'
    }
};

// Basketball API (Balldontlie - Free, no key needed)
const BASKETBALL_API = 'https://www.balldontlie.io/api/v1';

// Basketball Leagues (Top competitions)
const BASKETBALL_LEAGUES = {
    'nba': {
        name: '🏀 NBA',
        id: 'nba',
        priority: 1,
        emoji: '🏀'
    },
    'euroleague': {
        name: '🏀 EuroLeague',
        id: 'euroleague',
        priority: 1,
        emoji: '🏀'
    },
    'ncaa': {
        name: '🏀 NCAA (College)',
        id: 'ncaa',
        priority: 2,
        emoji: '🎓'
    }
};

/**
 * Fetch football fixtures from Football-Data.org
 */
async function fetchFootballFixtures(leagueCode) {
    try {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        
        const dateFrom = today.toISOString().split('T')[0];
        const dateTo = nextWeek.toISOString().split('T')[0];
        
        const url = `${FOOTBALL_API.url}/competitions/${leagueCode}/matches`;
        
        const response = await axios.get(url, {
            headers: FOOTBALL_API.headers,
            params: {
                dateFrom: dateFrom,
                dateTo: dateTo,
                status: 'SCHEDULED'
            },
            timeout: 10000
        });
        
        return response.data.matches || [];
    } catch (error) {
        console.error(`Error fetching football fixtures for ${leagueCode}:`, error.message);
        return [];
    }
}

/**
 * Fetch basketball fixtures from Balldontlie
 */
async function fetchBasketballFixtures(league = 'nba') {
    try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        // For NBA and NCAA
        let url = `${BASKETBALL_API}/games`;
        let params = {
            dates: [dateStr],
            per_page: 50
        };
        
        // EuroLeague isn't fully supported by Balldontlie, use alternative
        if (league === 'euroleague') {
            return fetchEuroLeagueFixtures();
        }
        
        const response = await axios.get(url, { params, timeout: 10000 });
        
        // Filter by season if needed
        let games = response.data.data;
        
        // For NCAA, filter by postseason flag or tournament
        if (league === 'ncaa') {
            games = games.filter(g => g.postseason || g.tournament);
        }
        
        return games;
    } catch (error) {
        console.error(`Error fetching basketball fixtures:`, error.message);
        return [];
    }
}

/**
 * Fetch EuroLeague fixtures (using alternative source)
 */
async function fetchEuroLeagueFixtures() {
    try {
        // TheSportsDB as fallback for EuroLeague (no key needed)
        const response = await axios.get('https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php', {
            params: { id: '4402' }, // EuroLeague ID
            timeout: 10000
        });
        
        return response.data.events || [];
    } catch (error) {
        console.error('Error fetching EuroLeague fixtures:', error.message);
        return [];
    }
}

/**
 * Format football fixture for display
 */
function formatFootballFixture(match) {
    const homeTeam = match.homeTeam?.name || 'TBD';
    const awayTeam = match.awayTeam?.name || 'TBD';
    const matchDate = new Date(match.utcDate);
    
    const formattedDate = matchDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `📅 ${formattedDate}\n   ${homeTeam} vs ${awayTeam}`;
}

/**
 * Format basketball fixture for display
 */
function formatBasketballFixture(game) {
    if (game.strEvent) {
        // EuroLeague format (from TheSportsDB)
        const homeTeam = game.strHomeTeam;
        const awayTeam = game.strAwayTeam;
        const date = new Date(game.dateEvent).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        return `📅 ${date}\n   ${homeTeam} vs ${awayTeam}`;
    }
    
    // NBA/NCAA format (from Balldontlie)
    const homeTeam = game.home_team?.full_name || game.home_team?.name || 'TBD';
    const awayTeam = game.visitor_team?.full_name || game.visitor_team?.name || 'TBD';
    const gameDate = new Date(game.date);
    
    const formattedDate = gameDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let venue = '';
    if (game.venue?.name) {
        venue = `\n   📍 ${game.venue.name}`;
    }
    
    return `📅 ${formattedDate}\n   ${homeTeam} vs ${awayTeam}${venue}`;
}

/**
 * Get football fixtures for a specific league
 */
async function getFootballFixtures(sock, leagueKey, chatId) {
    const league = FOOTBALL_LEAGUES[leagueKey];
    if (!league) {
        await sock.sendMessage(chatId, { text: `❌ League '${leagueKey}' not found!` });
        return false;
    }
    
    await sock.sendMessage(chatId, { text: `🔍 Fetching ${league.name} fixtures...` });
    
    const fixtures = await fetchFootballFixtures(league.code);
    
    if (!fixtures || fixtures.length === 0) {
        await sock.sendMessage(chatId, { 
            text: `📭 No upcoming fixtures found for ${league.name} in the next 7 days.\n\nTry another league or check back later!` 
        });
        return false;
    }
    
    let message = `⚽ *${league.name}* ⚽\n━━━━━━━━━━━━━━━━━━━\n📆 Next 7 days:\n\n`;
    let count = 0;
    
    for (const fixture of fixtures.slice(0, 10)) {
        message += `${formatFootballFixture(fixture)}\n\n`;
        count++;
    }
    
    message += `━━━━━━━━━━━━━━━━━━━\n📌 /fixtures list - See all leagues\n🏀 /basketball - NBA fixtures`;
    
    await sock.sendMessage(chatId, { text: message });
    return true;
}

/**
 * Get basketball fixtures
 */
async function getBasketballFixtures(sock, leagueType, chatId) {
    let leagues = [];
    
    if (leagueType === 'all' || !leagueType) {
        leagues = ['nba', 'euroleague'];
    } else if (leagueType === 'ncaa') {
        leagues = ['ncaa'];
    } else {
        leagues = [leagueType];
    }
    
    await sock.sendMessage(chatId, { text: `🏀 Fetching basketball fixtures...` });
    
    let message = `🏀 *BASKETBALL FIXTURES* 🏀\n━━━━━━━━━━━━━━━━━━━\n📆 Today's games:\n\n`;
    let hasGames = false;
    
    for (const leagueName of leagues) {
        const league = BASKETBALL_LEAGUES[leagueName];
        if (!league) continue;
        
        let fixtures = [];
        if (leagueName === 'euroleague') {
            fixtures = await fetchEuroLeagueFixtures();
            if (fixtures.length > 0) {
                hasGames = true;
                message += `\n${league.emoji} *${league.name}*\n`;
                for (const game of fixtures.slice(0, 5)) {
                    message += `${formatBasketballFixture(game)}\n\n`;
                }
            }
        } else {
            fixtures = await fetchBasketballFixtures(leagueName);
            if (fixtures.length > 0) {
                hasGames = true;
                message += `\n${league.emoji} *${league.name}*\n`;
                for (const game of fixtures.slice(0, 8)) {
                    message += `${formatBasketballFixture(game)}\n\n`;
                }
            }
        }
    }
    
    if (!hasGames) {
        await sock.sendMessage(chatId, { 
            text: `📭 No basketball fixtures found for today.\n\n📅 Check back tomorrow for game schedules!` 
        });
        return false;
    }
    
    message += `━━━━━━━━━━━━━━━━━━━\n📌 /fixtures - Football fixtures\n⚽ /livescore - Live scores`;
    
    await sock.sendMessage(chatId, { text: message });
    return true;
}

/**
 * List all available leagues
 */
async function listLeagues(sock, chatId) {
    let message = `📋 *AVAILABLE LEAGUES* 📋\n━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `⚽ *FOOTBALL (Top Leagues)*\n`;
    for (const [key, league] of Object.entries(FOOTBALL_LEAGUES)) {
        if (league.priority === 1) {
            message += `   • /fixtures ${key} - ${league.name}\n`;
        }
    }
    
    message += `\n🏀 *BASKETBALL*\n`;
    message += `   • /basketball - NBA & EuroLeague\n`;
    message += `   • /basketball nba - NBA only\n`;
    message += `   • /basketball euroleague - EuroLeague only\n`;
    message += `   • /basketball ncaa - NCAA College\n`;
    
    message += `\n━━━━━━━━━━━━━━━━━━━\n💡 Example: /fixtures premier-league\n🏀 Example: /basketball nba`;
    
    await sock.sendMessage(chatId, { text: message });
}

/**
 * Main command handler
 */
async function handleFixturesCommand(sock, messageText, chatId) {
    const args = messageText.toLowerCase().split(' ');
    const command = args[0];
    
    // Basketball commands
    if (command === '/basketball') {
        const league = args[1];
        if (league === 'nba' || league === 'euroleague' || league === 'ncaa') {
            await getBasketballFixtures(sock, league, chatId);
        } else {
            await getBasketballFixtures(sock, 'all', chatId);
        }
        return;
    }
    
    // Football fixtures
    if (command === '/fixtures' || command === '/fixture') {
        const leagueArg = args[1];
        
        if (!leagueArg) {
            await listLeagues(sock, chatId);
            return;
        }
        
        if (leagueArg === 'list' || leagueArg === 'help') {
            await listLeagues(sock, chatId);
            return;
        }
        
        if (leagueArg === 'all') {
            await sock.sendMessage(chatId, { text: `📋 Use specific league commands:\n/fixtures premier-league\n/fixtures laliga\n/fixtures serie-a\n/fixtures bundesliga\n/fixtures uefa-champions-league` });
            return;
        }
        
        // Find matching league
        let matchedKey = null;
        for (const [key, league] of Object.entries(FOOTBALL_LEAGUES)) {
            if (key === leagueArg || league.name.toLowerCase().includes(leagueArg)) {
                matchedKey = key;
                break;
            }
        }
        
        if (matchedKey) {
            await getFootballFixtures(sock, matchedKey, chatId);
        } else {
            await sock.sendMessage(chatId, {
                text: `❌ League '${leagueArg}' not found!\n\n📋 Use /fixtures to see all available leagues.`
            });
        }
    }
}

module.exports = {
    handleFixturesCommand,
    getFootballFixtures,
    getBasketballFixtures,
    listLeagues,
    FOOTBALL_LEAGUES,
    BASKETBALL_LEAGUES
};
