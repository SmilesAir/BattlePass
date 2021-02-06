
const Duel = require("duel")

const MainStore = require("./mainStore.js")
const { MatchResult } = require("./dataClasses.js")
const { fetchEx, fetchAuth } = require("./endpoints.js")
const Common = require("./common.js")

function fillNewMatchResults(duel) {
    if (MainStore.currentBracket === undefined) {
        console.error("No Bracket set")
        return
    }

    MainStore.brackets[MainStore.currentBracket].results = {}

    for (let match of duel.matches) {
        let result = new MatchResult(match.id.s, match.id.r, match.id.m, 0, 0, false)
        MainStore.brackets[MainStore.currentBracket].results[result.dynamodId] = result
    }
}

module.exports.updateBracketFromNamesString = function(namesString, createNewBracket) {
    Common.updateBracketFromNames(namesString.split("\n"), createNewBracket)
}

module.exports.getMatchResults = function() {
    let currentBracket = Common.getCurrentBracket()
    return currentBracket && currentBracket.results
}

module.exports.getCurrentBracket = function() {
    return MainStore.brackets && MainStore.brackets[MainStore.currentBracket]
}

module.exports.getCurrentMatch = function() {
    let currentBracket = Common.getCurrentBracket()
    if (currentBracket !== undefined) {
        let results = currentBracket.results[Common.reacketIdToDynamoId(MainStore.currentMatchId)]
        let reacket = MainStore.reacketMatches.find((match) => {
            return match.id === MainStore.currentMatchId
        })
        if (results !== undefined && reacket !== undefined) {
            return {
                results: results,
                reacket: reacket
            }
        }
    }

    return undefined
}

module.exports.getReacketIdFromString = function(idString, roundCount) {
    let parts = idString.split(".")

    if (parts.length !== 3) {
        return idString
    }

    return module.exports.getReacketId({
        s: parseInt(parts[0], 10),
        r: parseInt(parts[1], 10),
        m: parseInt(parts[2], 10)
    }, roundCount)
}

module.exports.getReacketId = function(id, roundCount) {
    if (id.s === 2) {
        return "CF"
    } else if (id.r === roundCount) {
        return "FN"
    }

    let topNum = Math.pow(2, roundCount - id.r + 1)
    let matchNum = 1
    for (let match of MainStore.duel.matches) {
        if (match.id.s === id.s && match.id.r === id.r) {
            let isSpacer = match.p.find((playerIndex) => {
                return playerIndex === -1
            }) !== undefined
            if (!isSpacer) {
                matchNum += match.id.m < id.m
            }
        }
    }

    return `${topNum}.${matchNum}`
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

    let matchResults = module.exports.getMatchResults()
    for (let resultId in matchResults) {
        let result = matchResults[resultId]
        if (result.isFinal) {
            MainStore.duel.score(result.duelId, result.score)
        }
    }

    MainStore.roundCount = 0
    for (let match of MainStore.duel.matches) {
        MainStore.roundCount = Math.max(match.id.r, MainStore.roundCount)
    }

    MainStore.reacketMatches.splice(0, MainStore.reacketMatches.length)
    for (let match of MainStore.duel.matches) {
        let id = `${match.id.s}.${match.id.r}.${match.id.m}`
        let dynamoId = Common.reacketIdToDynamoId(id)
        let result = matchResults[dynamoId]
        let score0 = ""
        let score1 = ""
        let isTBD = match.p.find((player) => {
            return player === 0
        }) !== undefined
        let started = result !== undefined ? result.score[0] !== 0 || result.score[1] !== 0 : false
        if (started) {
            score0 = `${result && result.score[0] || 0}`
            score1 = `${result && result.score[1] || 0}`
        } else if (!isTBD) {
            if (result !== undefined) {
                let total = result.wagerTotals[0] + result.wagerTotals[1]
                if (total > 0) {
                    score0 = `${(result.wagerTotals[0] / total * 100).toFixed(0)}%`
                    score1 = `${(result.wagerTotals[1] / total * 100).toFixed(0)}%`
                } else {
                    score0 = "0%"
                    score1 = "0%"
                }
            }
        }
        let newMatch = {
            id: id,
            round: match.id.s === 2 ? MainStore.duel.p : match.id.r,
            match: match.id.m,
            players: [],
            score: [
                score0,
                score1
            ],
            isFinal: result.isFinal,
            isCurrent: MainStore.currentMatchId === id,
            label: module.exports.getReacketId(match.id, MainStore.roundCount)
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
    let matchResults = MainStore.brackets[MainStore.currentBracket].results
    for (let resultId in matchResults) {
        let result = matchResults[resultId]
        if (result.isFinal) {
            MainStore.duel.score(result.duelId, result.score)
        }
    }

    for (let duelMatch of MainStore.duel.matches) {
        let id = `${duelMatch.id.s}.${duelMatch.id.r}.${duelMatch.id.m}`
        let result = matchResults[Common.reacketIdToDynamoId(id)]
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
            reacketMatch.score[0] = `${result.score[0]}`
            reacketMatch.score[1] = `${result.score[1]}`
        }

        reacketMatch.isFinal = result.isFinal
        reacketMatch.isCurrent = MainStore.currentMatchId === id
    }
}

module.exports.updateEventInfoFromAws = function(getCheers) {
    return fetchEx("GET_CURRENT_EVENT_INFO", undefined, getCheers === true ? { cheers: 1 } : undefined, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((response) => {
        return response.json()
    }).then((response) => {
        if (response.info !== undefined) {
            MainStore.eventName = response.info.eventName
            MainStore.currentBracket = response.info.currentBracket
            MainStore.brackets = response.info.brackets
            MainStore.eventRaffleTicketCount = response.info.raffleTicketCount
            MainStore.eventCheers = response.info.cheers
            let currentBracket = module.exports.getCurrentBracket()
            MainStore.currentMatchId = currentBracket !== undefined ? module.exports.dynamoIdToReacketId(currentBracket.currentMatchId) : undefined
            MainStore.constants = response.constants

            for (let updatedCallback of MainStore.eventDataUpdatedCallbacks) {
                updatedCallback(response.info)
            }

            if (currentBracket !== undefined) {
                module.exports.updateBracketFromNames(MainStore.brackets[MainStore.currentBracket].names)
            }
        } else {
            console.log("No events")
        }
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

module.exports.getUserTier = function() {
    return MainStore.userData && MainStore.userData[MainStore.eventName] && MainStore.userData[MainStore.eventName].tier || 0
}

module.exports.getCheersRemaining = function() {
    let data = MainStore.userData && MainStore.userData[MainStore.eventName]
    if (data === undefined) {
        return 0
    }

    return Math.max(data.cheersRemaining, Math.min(MainStore.constants.maxCheers, data.cheersRemaining + Math.floor((Date.now() - data.lastCheerAt) / MainStore.constants.cheerCooldown)))
}

module.exports.consumeCheer = function() {
    let data = MainStore.userData && MainStore.userData[MainStore.eventName]
    if (data === undefined) {
        return
    }

    let now = Date.now()
    let earnedCheers = (now - data.lastCheerAt) / MainStore.constants.cheerCooldown
    let cheersRemaining = Common.getCheersRemaining()
    let partial = 0
    if (cheersRemaining < MainStore.constants.maxCheers) {
        partial = earnedCheers % 1 * MainStore.constants.cheerCooldown
    }

    data.cheersRemaining = cheersRemaining - 1
    data.lastCheerAt = now - partial
}

module.exports.getTimeToNextEarnedCheer = function() {
    let data = MainStore.userData && MainStore.userData[MainStore.eventName]
    if (data === undefined) {
        return undefined
    }

    let cheersRemaining = Common.getCheersRemaining()

    if (cheersRemaining >= MainStore.constants.maxCheers) {
        return undefined
    }

    return MainStore.constants.cheerCooldown - (Date.now() - data.lastCheerAt) / MainStore.constants.cheerCooldown % 1 * MainStore.constants.cheerCooldown
}

module.exports.areUncollectedRewards = function() {
    if (MainStore === undefined || MainStore.brackets === undefined || MainStore.userData === undefined || MainStore.userData[MainStore.eventName] === undefined) {
        return false
    }

    let unprocessed = []
    let eventData = MainStore.userData[MainStore.eventName]
    for (let pick in eventData.picks) {
        if (eventData.processed[pick] === undefined) {
            unprocessed.push(pick)
        }
    }

    for (let pick of unprocessed) {
        let bracketName = pick.split(/_(.+)/)[0]
        let matchId = pick.split(/_(.+)/)[1]
        if (MainStore.brackets[bracketName] === undefined) {
            return false
        }

        let matchData = MainStore.brackets[bracketName].results[matchId]
        if (matchData.isFinal === true) {
            return true
        }
    }

    return false
}

module.exports.idToPrettyName = function(id) {
    let parts = Common.dynamoIdToReacketId(id).split(".")
    if (parts.length !== 3) {
        return "Invalid Id"
    }

    if (parts[0] === "2") {
        return "Consolation Final"
    }

    let roundNames = [
        "Final",
        "Semifinal",
        "Quaterfinal",
        "Preliminary"
    ]

    if (`${MainStore.duel.p}` === parts[1]) {
        return "Final"
    }

    let reacketLabel = module.exports.getReacketIdFromString(id, MainStore.roundCount)
    let reacketLabelMatchNum = reacketLabel.split(".")[1]
    let matchNum = reacketLabelMatchNum !== undefined ? reacketLabelMatchNum : parts[2]

    return `${roundNames[MainStore.duel.p - parts[1]]} ${matchNum}`
}

module.exports.getXpForLevel = function(level) {
    if (level < 1) {
        return 0
    }

    let xp = Math.pow(1.3, level - 1) + module.exports.getXpForLevel(level - 1)
    return xp
}

module.exports.getLevelFromXp = function(xp) {
    let level = 0
    for (; xp >= module.exports.getXpForLevel(level); ++level) {
        // stuff
    }

    return Math.max(level - 1, 0)
}
