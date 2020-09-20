
const Mobx = require("mobx")

module.exports = Mobx.observable({
    eventName: undefined,
    reacketMatches: [],
    brackets: {},
    eventRaffleTicketCount: 0,
    eventCheers: undefined,
    isLoggedIn: false,
    cognitoUsername: undefined,
    showAuthenticator: false,
    displayName: undefined,
    url: undefined,
    currentMatchId: undefined,
    duel: undefined,
    namesArray: [],
    userData: undefined,
    showUpgradePopup: false,
    showWelcome: false,
    showRewards: false,
    rewards: undefined,
    eventDataUpdatedCallbacks: []
})
