
const Duel = require("duel")

const MainStore = require("./mainStore.js")
const { MatchResult } = require("./dataClasses.js")
const { fetchEx } = require("./endpoints.js")

module.exports.updateBracketFromNamesString = function(namesString) {
    module.exports.updateBracketFromNames(namesString.split("\n"))
}

module.exports.updateBracketFromNames = function(namesArray) {
    let names = namesArray.filter((name) => {
        return name !== undefined && name.length > 0
    })

    if (names.length < 4) {
        return
    }

    let d = new Duel(names.length)

    for (let resultId in MainStore.matchResults) {
        let result = MainStore.matchResults[resultId]
        if (result.isFinal) {
            d.score(result.duelId, result.score)
        }
    }

    MainStore.matches.splice(0, MainStore.matches.length)
    for (let match of d.matches) {
        let id = `${match.id.s}.${match.id.r}.${match.id.m}`
        let result = MainStore.matchResults[id]
        let newMatch = {
            id: id,
            round: match.id.s === 2 ? d.p : match.id.r,
            match: match.id.m,
            players: [],
            "score": [
                result && result.score[0] || 0,
                result && result.score[1] || 0
            ]
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

        MainStore.matches.push(newMatch)
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
        module.exports.updateBracketFromNames(response.info.names)
    })
}
