// appends rune mysteries and peeling the onion to the shared quest list so
// their completion state is reported to the client

const quests = require('@2003scape/rsc-data/quests');

const CUSTOM_QUESTS = ['runeMysteries', 'peelingTheOnion'];

if (quests.length === 50) {
    quests.push(...CUSTOM_QUESTS);
}

module.exports = { CUSTOM_QUESTS };
