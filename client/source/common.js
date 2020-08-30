
const Duel = require("duel")

const MainStore = require("./mainStore.js")
const { MatchResult } = require("./dataClasses.js")
const { fetchEx, fetchAuth } = require("./endpoints.js")
const Common = require("./common.js")

function fillNewMatchResults(duel) {
    MainStore.matchResults = {}

    for (let match of duel.matches) {
        let result = new MatchResult(match.id.s, match.id.r, match.id.m, 0, 0, false)
        MainStore.matchResults[result.dynamodId] = result
    }
}

module.exports.updateBracketFromNamesString = function(namesString, createNewBracket) {
    module.exports.updateBracketFromNames(namesString.split("\n"), createNewBracket)
}

module.exports.updateBracketFromNames = function(namesArray, createNewBracket) {
    let names = namesArray.filter((name) => {
        return name !== undefined && name.length > 0
    })

    if (names.length < 4) {
        return
    }

    MainStore.namesArray = namesArray

    MainStore.duel = new Duel(names.length)

    if (createNewBracket === true) {
        fillNewMatchResults(MainStore.duel)
    }

    for (let resultId in MainStore.matchResults) {
        let result = MainStore.matchResults[resultId]
        if (result.isFinal) {
            MainStore.duel.score(result.duelId, result.score)
        }
    }

    MainStore.reacketMatches.splice(0, MainStore.reacketMatches.length)
    for (let match of MainStore.duel.matches) {
        let id = `${match.id.s}.${match.id.r}.${match.id.m}`
        let dynamoId = Common.reacketIdToDynamoId(id)
        let result = MainStore.matchResults[dynamoId]
        let newMatch = {
            id: id,
            round: match.id.s === 2 ? MainStore.duel.p : match.id.r,
            match: match.id.m,
            players: [],
            score: [
                result && result.score[0] || 0,
                result && result.score[1] || 0
            ],
            isFinal: result.isFinal,
            isCurrent: MainStore.currentMatchId === id
        }

        for (let player of match.p) {
            if (player === 0) {
                newMatch.players.push({
                    "id": 0,
                    "name": "TBD",
                    "seed": 0
                })
            } else if (player !== -1) {
                newMatch.players.push({
                    "id": player,
                    "name": names[player - 1],
                    "seed": player
                })
            } else {
                newMatch.needSpacer = true
                newMatch.players.push({
                    "id": 0,
                    "name": "Spacer",
                    "seed": 0
                })
            }
        }

        MainStore.reacketMatches.push(newMatch)
    }
}

module.exports.updateScores = function() {
    for (let resultId in MainStore.matchResults) {
        let result = MainStore.matchResults[resultId]
        if (result.isFinal) {
            MainStore.duel.score(result.duelId, result.score)
        }
    }

    for (let duelMatch of MainStore.duel.matches) {
        let id = `${duelMatch.id.s}.${duelMatch.id.r}.${duelMatch.id.m}`
        let result = MainStore.matchResults[Common.reacketIdToDynamoId(id)]
        let reacketMatch = MainStore.reacketMatches.find((match) => {
            return match.id === id
        })

        for (let playerIndex = 0; playerIndex < duelMatch.p.length; ++playerIndex) {
            let duelPlayer = duelMatch.p[playerIndex]

            if (duelPlayer !== 0 && duelPlayer !== -1) {
                reacketMatch.players[playerIndex] = {
                    "id": duelPlayer,
                    "name": MainStore.namesArray[duelPlayer - 1],
                    "seed": duelPlayer
                }
            }
        }

        if (reacketMatch !== undefined && result !== undefined) {
            reacketMatch.score[0] = result.score[0]
            reacketMatch.score[1] = result.score[1]
        }

        reacketMatch.isFinal = result.isFinal
        reacketMatch.isCurrent = MainStore.currentMatchId === id
    }
}

module.exports.updateEventInfoFromAws = function() {
    return fetchEx("GET_CURRENT_EVENT_INFO", undefined, undefined, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((response) => {
        return response.json()
    }).then((response) => {
        MainStore.eventName = response.info.eventName
        MainStore.currentMatchId = module.exports.dynamoIdToReacketId(response.info.currentMatchId)
        MainStore.matchResults = response.info.results
        module.exports.updateBracketFromNames(response.info.names)
    })
}

module.exports.reacketIdToDynamoId = function(id) {
    return id && id.replace(/\./g, "_")
}

module.exports.dynamoIdToReacketId = function(id) {
    return id && id.replace(/_/g, ".")
}

module.exports.fillUserData = function() {
    MainStore.Auth.currentAuthenticatedUser().then((data) => {
        return fetchAuth("GET_USER_DATA", { eventName: MainStore.eventName }, undefined, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": data.signInUserSession.accessToken.jwtToken
            }
        }).then((response) => {
            return response.json()
        }).then((response) => {
            MainStore.userData = response.data
        }).catch((error) => {
            console.log("GET_USER_DATA Error", error)
        })
    })
}

module.exports.isAdmin = function() {
    return MainStore.userData && MainStore.userData.isAdmin || false
}
