
const Mobx = require("mobx")

module.exports = Mobx.observable({
    eventName: undefined,
    reacketMatches: [],
    matchResults: {},
    isLoggedIn: false,
    cognitoUsername: undefined,
    showAuthenticator: false,
    displayName: undefined,
    isAdmin: true,
    url: undefined,
    currentMatchId: undefined,
    duel: undefined,
    namesArray: []
})
