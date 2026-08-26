// OpenRSC holiday drops for single-player, enabled per world via config.holidayEvents. during the calendar windows
// below an hourly event drops one random item from the list on each unblocked tile. pools: halloween Scythe(1289); christmas Present(980), Christmas cracker(575), Santa's hat(971); easter Easter egg(677)
const EVENTS = {
    easter: {
        name: 'Easter',
        items: [677]
    },
    halloween: {
        name: 'Halloween',
        items: [1289]
    },
    christmas: {
        name: 'Christmas',
        items: [980, 575, 971]
    }
};

// the event active on the given date, or null
function activeEvent(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if (month === 4 && day <= 15) {
        return 'easter';
    }

    if ((month === 10 && day >= 24) || (month === 11 && day <= 1)) {
        return 'halloween';
    }

    if ((month === 12 && day >= 14) || (month === 1 && day <= 2)) {
        return 'christmas';
    }

    return null;
}

module.exports = { EVENTS, activeEvent };
