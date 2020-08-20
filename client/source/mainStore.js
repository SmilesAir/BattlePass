
const Mobx = require("mobx")

module.exports = Mobx.observable({
    matches: [],
    matchResults: {},
    isLoggedIn: false,
    cognitoUsername: undefined,
    showAuthenticator: false,
    displayName: undefined,
    isAdmin: true,
    url: undefined,
    currentMatch: undefined
})
