
const Mobx = require("mobx")

module.exports = Mobx.observable({
    eventName: undefined,
    reacketMatches: [],
    brackets: {},
    isLoggedIn: false,
    cognitoUsername: undefined,
    showAuthenticator: false,
    displayName: undefined,
    url: undefined,
    currentMatchId: undefined,
    duel: undefined,
    namesArray: [],
    userData: undefined
})
