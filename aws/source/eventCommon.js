const AWS = require('aws-sdk')
const uuid = require('uuid')
let docClient = new AWS.DynamoDB.DocumentClient()

const Common = require("./common.js")

module.exports.setupNewEvent = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventName = decodeURIComponent(event.pathParameters.eventName)

    let getParams = {
        TableName: process.env.EVENT_TABLE,
        Key: {"key": eventName}
    }
    await docClient.get(getParams).promise().then((response) => {
        if (!Common.isEmptyObject(response)) {
            if (response.Item.locked !== true) {
                return createNewEvent(eventName)
            } else {
                throw "Trying to overwrite locked event"
            }
        } else {
            return createNewEvent(eventName)
        }
    }).catch((error) => {
        console.error(error)

        return {
            success: false,
            message: error
        }
    })

    return {
        success: true
    }
})}

function createNewEvent(eventName) {
    let putParams = {
        TableName : process.env.EVENT_TABLE,
        Item: {
            key: eventName,
            eventName: eventName,
            createdTime: Date.now(),
            currentBracket: undefined,
            brackets: {},
            raffleTicketCount: 0,
            locked: true,
            cheers: []
        }
    }

    return docClient.put(putParams).promise()
}

module.exports.setupNewBracket = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let request = JSON.parse(event.body) || {}
    let eventName = decodeURIComponent(event.pathParameters.eventName)
    let bracketName = decodeURIComponent(event.pathParameters.bracketName)

    let doUpdate = false
    let getParams = {
        TableName: process.env.EVENT_TABLE,
        Key: {"key": eventName}
    }
    let eventData = await docClient.get(getParams).promise().then((response) => {
        let bracketData = response.Item.brackets[bracketName]
        if (bracketData === undefined || bracketData.locked !== true) {
            doUpdate = true
        }

        return response.Item
    }).catch()

    if (eventData.brackets !== undefined && eventData.brackets[bracketName] && eventData.brackets[bracketName].isLocked === true) {
        return {
            success: false,
            message: "Bracket is locked!"
        }
    }

    if (doUpdate) {
        let updateParams = {
            TableName: process.env.EVENT_TABLE,
            Key: {"key": eventName},
            UpdateExpression: "set brackets.#bracketName = :bracketData, currentBracket = :bracketName",
            ExpressionAttributeNames: {
                "#bracketName": bracketName
            },
            ExpressionAttributeValues: {
                ":bracketName": bracketName,
                ":bracketData": {
                    names: request.names,
                    results: request.results
                }
            },
            ReturnValues: "NONE"
        }
        await docClient.update(updateParams).promise().catch((error) => {
            throw error
        })
    }

    return {
        success: true
    }
})}

module.exports.setupSetCurrentEvent = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventName = decodeURIComponent(event.pathParameters.eventName)

    let eventInfo = await module.exports.getEventInfo(eventName)
    if (Common.isEmptyObject(eventInfo)) {
        return {
            success: false,
            message: `No event info by name of ${eventName}`
        }
    }

    let masterInfo = await module.exports.getMasterInfo()
    masterInfo.data.current = eventName
    masterInfo.lastUpdatedAt = Date.now()

    let putParams = {
        TableName : process.env.EVENT_TABLE,
        Item: masterInfo
    }

    await docClient.put(putParams).promise()

    return {
        success: true
    }
})}

module.exports.setupSetCurrentBracket = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventName = decodeURIComponent(event.pathParameters.eventName)
    let bracketName = decodeURIComponent(event.pathParameters.bracketName)

    let updateParams = {
        TableName: process.env.EVENT_TABLE,
        Key: {"key": eventName},
        UpdateExpression: "set currentBracket = :bracketName",
        ExpressionAttributeValues: {
            ":bracketName": bracketName
        },
        ReturnValues: "NONE"
    }
    await docClient.update(updateParams).promise().catch((error) => {
        throw error
    })
})}
module.exports.setupSetCurrentBracketLocked = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventName = decodeURIComponent(event.pathParameters.eventName)
    let bracketName = decodeURIComponent(event.pathParameters.bracketName)
    let isLocked = decodeURIComponent(event.pathParameters.isLocked) === "true"

    let updateParams = {
        TableName: process.env.EVENT_TABLE,
        Key: {"key": eventName},
        UpdateExpression: "set brackets.#bracketName.isLocked = :isLocked",
        ExpressionAttributeNames: {
            "#bracketName": bracketName
        },
        ExpressionAttributeValues: {
            ":isLocked": isLocked
        },
        ReturnValues: "NONE"
    }
    await docClient.update(updateParams).promise().catch((error) => {
        throw error
    })
})}

module.exports.setupGetEvents = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let scanParams = {
        TableName: process.env.EVENT_TABLE
    }
    return await docClient.scan(scanParams).promise().then((response) => {
        let masterInfo = undefined
        let eventNames = []
        for (let item of response.Items) {
            if (item.key === "masterInfo") {
                masterInfo = item
            } else {
                eventNames.push(item.eventName)
            }
        }

        if (masterInfo === undefined) {
            throw "Missing masterInfo"
        }

        return {
            success: true,
            eventNames: eventNames,
            masterInfo: masterInfo
        }
    }).catch((error) => {
        console.error(error)

        return {
            success: false,
            message: error
        }
    })
})}

module.exports.getCurrentEventInfo = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let masterInfo = await module.exports.getMasterInfo()
    let fetchCheers = decodeURIComponent(event.queryStringParameters && event.queryStringParameters.cheers)

    if (masterInfo.data.current === null) {
        return {
            success: false,
            message: "No current event set"
        }
    }

    let getParams = {
        TableName: process.env.EVENT_TABLE,
        Key: {"key": masterInfo.data.current}
    }
    return docClient.get(getParams).promise().then((response) => {
        if (Common.isEmptyObject(response)) {
            return {
                success: true,
                constants: masterInfo.constants
            }
        }
        else {
            if (fetchCheers !== "1") {
                response.Item.cheers = []
            }
            return {
                success: true,
                info: response.Item,
                constants: masterInfo.constants
            }
        }
    })
})}

module.exports.getMasterInfo = function() {
    let getParams = {
        TableName: process.env.EVENT_TABLE,
        Key: {"key": "masterInfo"}
    }

    return docClient.get(getParams).promise().then((response) => {
        if (Common.isEmptyObject(response)) {
            throw "missing masterInfo"
        }

        return response.Item
    }).catch((error) => {
        console.error(error)
    })
}

module.exports.getEventInfo = function(eventName) {
    let getParams = {
        TableName: process.env.EVENT_TABLE,
        Key: {"key": eventName}
    }

    return docClient.get(getParams).promise().then((response) => {
        return response && response.Item
    }).catch((error) => {
        console.error(error)
    })
}

module.exports.setupGetEvent = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventName = decodeURIComponent(event.pathParameters.eventName)

    return module.exports.getEventInfo(eventName)
})}

module.exports.setCurrentMatch = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventName = decodeURIComponent(event.pathParameters.eventName)
    let bracketName = decodeURIComponent(event.pathParameters.bracketName)
    let matchId = decodeURIComponent(event.pathParameters.matchId)
    let player1Id = decodeURIComponent(event.pathParameters.player1Id)
    let player2Id = decodeURIComponent(event.pathParameters.player2Id)

    // Create a new match for player ratings
    let ratingMatchId = "undefined"
    if (player1Id !== "undefined" && player2Id !== "undefined") {
        ratingMatchId = await addRatedMatch(player1Id, player2Id, {
            eventName: eventName,
            bracketName: bracketName
        })
    }

    let params = {
        TableName: process.env.EVENT_TABLE,
        Key: {"key": eventName},
        UpdateExpression: "set brackets.#bracketName.currentMatchId = :id, brackets.#bracketName.results.#matchId.ratingMatchId = :ratingMatchId",
        ExpressionAttributeNames: {
            "#bracketName": bracketName,
            "#matchId": matchId
        },
        ExpressionAttributeValues: {
            ":id": matchId,
            ":ratingMatchId": ratingMatchId || "undefined"
        },
        ReturnValues: "NONE"
    }
    return docClient.update(params).promise().then((resp) => {
        return {
            success: true
        }
    }).catch((error) => {
        return {
            success: false,
            message: error
        }
    })
})}

module.exports.updateMatchScore = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventName = decodeURIComponent(event.pathParameters.eventName)
    let bracketName = decodeURIComponent(event.pathParameters.bracketName)
    let matchId = decodeURIComponent(event.pathParameters.matchId)
    let player1Id = decodeURIComponent(event.pathParameters.player1Id)
    let player2Id = decodeURIComponent(event.pathParameters.player2Id)
    let ratingMatchId = decodeURIComponent(event.pathParameters.ratingMatchId)
    let request = JSON.parse(event.body) || {}

    if (request.isFinal !== undefined) {
        await updatePlayerRatings(eventName)

        let params = {
            TableName: process.env.EVENT_TABLE,
            Key: {"key": eventName},
            UpdateExpression: `set brackets.#bracketName.results.#matchId.isFinal = :isFinal`,
            ExpressionAttributeNames: {
                "#bracketName": bracketName,
                "#matchId": matchId
            },
            ExpressionAttributeValues: {
                ":isFinal": request.isFinal
            },
            ReturnValues: "NONE"
        }
        return docClient.update(params).promise().then((resp) => {
            return {
                success: true
            }
        }).catch((error) => {
            console.log("error", error)
            return {
                success: false,
                message: error
            }
        })
    } else {
        if (request.pointDelta > 0) {
            // Create a new match for player ratings
            if (player1Id !== "undefined" && player2Id !== "undefined" && ratingMatchId !== "undefined") {
                await addRatedBattle(player1Id, player2Id, request.playerIndex === 0 ? -1 : 1, ratingMatchId)
            }
        }

        let getParams = {
            TableName: process.env.MATCH_TABLE,
            Key: {"key": ratingMatchId}
        }

        let ratingMatch = await docClient.get(getParams).promise().then((response) => {
            return response && response.Item
        }).catch((error) => {
            console.log(error)
        })

        let params = {
            TableName: process.env.EVENT_TABLE,
            Key: {"key": eventName},
            UpdateExpression: `set brackets.#bracketName.results.#matchId.score[${request.playerIndex}] = brackets.#bracketName.results.#matchId.score[${request.playerIndex}] + :pointDelta, brackets.#bracketName.results.#matchId.isPickable = :false, brackets.#bracketName.results.#matchId.ratingMatchData = :ratingMatchData`,
            ExpressionAttributeNames: {
                "#bracketName": bracketName,
                "#matchId": matchId
            },
            ExpressionAttributeValues: {
                ":pointDelta": request.pointDelta,
                ":false": false,
                ":ratingMatchData": ratingMatch && ratingMatch.players || []
            },
            ReturnValues: "NONE"
        }
        return docClient.update(params).promise().then(() => {
            return {
                success: true
            }
        }).catch((error) => {
            return {
                success: false,
                message: error
            }
        })
    }
})}

module.exports.getCurrentEventLeaderboard = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventName = decodeURIComponent(event.pathParameters.eventName)

    let params = {
        TableName: process.env.USER_TABLE,
        ProjectionExpression: "#eventName.points, displayName",
        ExpressionAttributeNames: {
            "#eventName": eventName
        }
    }

    let playerData = []
    let onScan = async (err, data) => {
        if (err) {
            throw "Error scaning player points for leaderboard. " + err
        } else {
            playerData = playerData.concat(data.Items.map((item) => {
                return {
                    displayName: item.displayName || "Anonymous",
                    points: item[eventName].points
                }
            }))

            if (data.LastEvaluatedKey !== undefined) {
                params.ExclusiveStartKey = data.LastEvaluatedKey
                await docClient.scan(params, onScan).promise()
            }
        }
    }

    await docClient.scan(params, onScan).promise()

    playerData = playerData.sort((a, b) => {
        return b.points - a.points
    })

    return {
        success: true,
        leaderboardData: playerData
    }
})}

module.exports.getPlayers = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let players = await getPlayers()

    return {
        success: true,
        players: players
    }
})}

module.exports.addNewPlayer = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let alias = decodeURIComponent(event.pathParameters.alias)

    let playerId = addNewPlayer(alias)

    return {
        success: true,
        playerId: playerId
    }
})}

module.exports.addNewPlayerAlias = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let playerId = decodeURIComponent(event.pathParameters.playerId)
    let alias = decodeURIComponent(event.pathParameters.alias)

    addNewPlayerAlias(playerId, alias)

    return {
        success: true
    }
})}

module.exports.addRatedMatch = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let player1Id = decodeURIComponent(event.pathParameters.player1Id)
    let player2Id = decodeURIComponent(event.pathParameters.player2Id)
    let info = JSON.parse(event.body) || {}

    let matchId = await addRatedMatch(player1Id, player2Id, info)

    return {
        success: true,
        matchId: matchId
    }
})}

module.exports.addRatedBattle = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let player1Id = decodeURIComponent(event.pathParameters.player1Id)
    let player2Id = decodeURIComponent(event.pathParameters.player2Id)
    let result = parseInt(decodeURIComponent(event.pathParameters.result))
    let matchId = decodeURIComponent(event.pathParameters.matchId)

    await addRatedBattle(player1Id, player2Id, result, matchId)

    return {
        success: true,
    }
})}

module.exports.updatePlayerRatings = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventName = decodeURIComponent(event.pathParameters.eventName)
    await updatePlayerRatings(eventName)

    return {
        success: true
    }
})}

module.exports.calculateAllElo = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    calculateAllElo()

    return {
        success: true
    }
})}

function insertRatedMatch(player1Id, player2Id, result, time) {

}

async function addRatedMatch(player1Id, player2Id, info) {
    let player1Data = await getPlayerData(player1Id)
    let player2Data = await getPlayerData(player2Id)

    let now = Date.now()
    let matchId = uuid.v1()
    let putParams = {
        TableName : process.env.MATCH_TABLE,
        Item: {
            key: matchId,
            createdAt: now,
            playedAt: now,
            info: info,
            battles: [],
            players: [
                {
                    playerId: player1Id,
                    oldRating: player1Data.rating,
                    newRating: player1Data.rating
                },
                {
                    playerId: player2Id,
                    oldRating: player2Data.rating,
                    newRating: player2Data.rating
                }
            ]
        }
    }
    await docClient.put(putParams).promise().catch((error) => {
        throw error
    })

    return matchId
}

function calculateElo(rating1, rating2, result) {
    // -1 means player1 won, 1 means player2 won, 0 means draw
    let r1 = Math.pow(10, rating1 / 400)
    let r2 = Math.pow(10, rating2 / 400)
    let e1 = r1 / (r1 + r2)
    let e2 = r2 / (r1 + r2)
    let s1 = result === 0 ? .5 : (result > 0 ? 0 : 1)
    let s2 = result === 0 ? .5 : (result > 0 ? 1 : 0)
    let k = 32

    return {
        rating1: rating1 + k * (s1 - e1),
        rating2: rating2 + k * (s2 - e2)
    }
}

async function addRatedBattle(player1Id, player2Id, result, matchId) {
    let player1Data = await getPlayerData(player1Id)
    let player2Data = await getPlayerData(player2Id)
    let newRating = calculateElo(player1Data.rating, player2Data.rating)

    let now = Date.now()
    let battleId = uuid.v1();
    let putParams = {
        TableName : process.env.BATTLE_TABLE,
        Item: {
            key: battleId,
            result: result,
            players: [
                {
                    playerId: player1Id,
                    oldRating: player1Data.rating,
                    newRating: newRating.rating1
                },
                {
                    playerId: player2Id,
                    oldRating: player2Data.rating,
                    newRating: newRating.rating2
                }
            ],
            createdAt: now,
            playedAt: now,
            matchId: matchId
        }
    }

    await docClient.put(putParams).promise().catch((error) => {
        throw error
    })

    let matchUpdateParams = {
        TableName : process.env.MATCH_TABLE,
        Key: {"key": matchId},
        ReturnValues: "NONE",
        UpdateExpression: "set players[0].newRating = :newR1, players[1].newRating = :newR2, battles = list_append(battles, :newBattle)",
        ExpressionAttributeValues: {
            ":newR1": newR1,
            ":newR2": newR2,
            ":newBattle": [battleId]
        }
    }
    await docClient.update(matchUpdateParams).promise().catch((error) => {
        throw error
    })

    await appendPlayerBattle(player1Id, battleId, newR1)
    await appendPlayerBattle(player2Id, battleId, newR2)
}

async function appendPlayerBattle(playerId, battleId, newRating) {
    let updateParams = {
        TableName : process.env.PLAYER_TABLE,
        Key: {"key": playerId},
        ReturnValues: "NONE",
        UpdateExpression: "set battles = list_append(battles, :battleId), rating = :rating",
        ExpressionAttributeValues: {
            ":rating": newRating,
            ":battleId": [battleId]
        }
    }
    await docClient.update(updateParams).promise().catch((error) => {
        throw error
    })
}

async function getPlayerData(playerId) {
    let getParams = {
        TableName: process.env.PLAYER_TABLE,
        Key: {"key": playerId}
    }

    return await docClient.get(getParams).promise().then((response) => {
        return response && response.Item
    }).catch((error) => {
        throw error
    })
}

async function addNewPlayer(alias) {
    let playerId = uuid.v1()
    let putParams = {
        TableName : process.env.PLAYER_TABLE,
        Item: {
            key: playerId,
            aliases: [],
            rating: 400,
            battles: [],
            createdAt: Date.now()
        }
    }

    await docClient.put(putParams).promise().catch((error) => {
        console.error(error)
    })

    addNewPlayerAlias(playerId, alias)

    return playerId
}

async function addNewPlayerAlias(playerId, alias) {
    let putParams = {
        TableName : process.env.PLAYER_ALIAS_TABLE,
        Item: {
            key: alias,
            playerId: playerId,
            createdAt: Date.now()
        }
    }

    await docClient.put(putParams).promise().catch((error) => {
        throw error
    })

    let updateParams = {
        TableName : process.env.PLAYER_TABLE,
        Key: {"key": playerId},
        ReturnValues: "NONE",
        UpdateExpression: "set aliases = list_append(aliases, :newAlias)",
        ExpressionAttributeValues: {
            ":newAlias": [alias]
        }
    }
    await docClient.update(updateParams).promise().catch((error) => {
        throw error
    })
}

async function getPlayers() {
    let players = []
    let onScan = async (err, data) => {
        if (err) {
            throw "Error scaning players. " + err
        } else {
            players = players.concat(data.Items.map((item) => {
                return {
                    playerId: item.key,
                    aliases: item.aliases,
                    rating: item.rating
                }
            }))

            if (data.LastEvaluatedKey !== undefined) {
                params.ExclusiveStartKey = data.LastEvaluatedKey
                await docClient.scan(params, onScan).promise()
            }
        }
    }

    let params = {
        TableName: process.env.PLAYER_TABLE,
        ProjectionExpression: "#key, aliases, rating",
        ExpressionAttributeNames: {
            "#key": "key"
        }
    }
    await docClient.scan(params, onScan).promise()

    return players
}

function findPlayerByAlias(players, inAlias) {
    for (let player of players) {
        if (player.aliases.find((alias) => {
            return alias.toLowerCase() === inAlias.toLowerCase()
        }) !== undefined) {
            return player
        }
    }

    return undefined
}

async function updatePlayerRatings(eventName) {
    let eventInfo = await module.exports.getEventInfo(eventName)

    let players = await getPlayers()
    for (let bracket in eventInfo.brackets) {
        let ratings = []
        for (let competitor of eventInfo.brackets[bracket].names) {
            let player = findPlayerByAlias(players, competitor)
            if (player !== undefined) {
                ratings.push(player.rating)
            } else {
                ratings.push(0)
            }
        }

        let updateParams = {
            TableName : process.env.EVENT_TABLE,
            Key: {"key": eventName},
            ReturnValues: "NONE",
            UpdateExpression: "set brackets.#bracketName.ratings = :ratings",
            ExpressionAttributeNames: {
                "#bracketName": bracket
            },
            ExpressionAttributeValues: {
                ":ratings": ratings
            }
        }
        await docClient.update(updateParams).promise().catch((error) => {
            throw error
        })
    }
}

async function calculateAllElo() {
    let matches = await scanTable(process.env.MATCH_TABLE, "playedAt, players, battles, #key", {
            "#key": "key"
        })
    matches = matches.sort((a, b) => {
        return a.playedAt - b.playedAt
    })

    let battles = await scanTable(process.env.BATTLE_TABLE, "players, #key, #result", {
            "#key": "key",
            "#result": "result"
        })

    let players = await scanTable(process.env.PLAYER_TABLE, "aliases, #key, battles, createdAt, rating", {
            "#key": "key"
        })

    let newPlayers = []
    let dirtyBattles = []
    let dirtyMatches = []

    for (let match of matches) {
        if (match.battles.length > 0) {
            let oldMatchPlayer1 = match.players[0]
            let oldMatchPlayer2 = match.players[1]
            let player1 = getOrAddPlayer(oldMatchPlayer1, newPlayers)
            let player2 = getOrAddPlayer(oldMatchPlayer2, newPlayers)

            let oldRating1 = player1.rating
            let oldRating2 = player2.rating

            for (let matchBattleKey of match.battles) {
                let battle = battles.find((x) => {
                    return x.key === matchBattleKey
                })
                if (battle === undefined) {
                    console.error("Can't find battle")
                } else {
                    let newRating = calculateElo(player1.rating, player2.rating, battle.result)
                    player1.rating = newRating.rating1
                    player2.rating = newRating.rating2

                    if (battle.players[0].oldRating !== player1.rating ||
                        battle.players[0].newRating !== newRating.rating1 ||
                        battle.players[1].oldRating !== player2.rating ||
                        battle.players[1].newRating !== newRating.rating2) {

                        battle.players[0].oldRating = player1.rating
                        battle.players[0].newRating = newRating.rating1
                        battle.players[1].oldRating = player2.rating
                        battle.players[1].newRating = newRating.rating2

                        dirtyBattles.push(battle)
                    }
                }
            }

            if (oldMatchPlayer1.oldRating !== oldRating1 ||
                oldMatchPlayer2.oldRating !== oldRating2 ||
                oldMatchPlayer1.newRating !== player1.rating ||
                oldMatchPlayer2.newRating !== player2.rating) {

                oldMatchPlayer1.oldRating = oldRating1
                oldMatchPlayer2.oldRating = oldRating2
                oldMatchPlayer1.newRating = player1.rating
                oldMatchPlayer2.newRating = player2.rating

                dirtyMatches.push(match)
            }

            //console.log(JSON.stringify(oldMatchPlayer1), JSON.stringify(match))
        }
    }

    let putRequests = []
    for (let playerIndex = 0; playerIndex < newPlayers.length; ++playerIndex) {
        let newPlayer = newPlayers[playerIndex]
        let oldPlayer = players.find((x) => {
            return x.key === newPlayer.playerId
        })
        if (oldPlayer === undefined) {
            console.error("Trying to update a player that didn't previously exist. ", newPlayer)
        } else if (oldPlayer.rating !== newPlayer.rating) {
            let putPlayer = Object.assign({}, oldPlayer)
            putPlayer.rating = newPlayer.rating
            putRequests.push({
                PutRequest: {
                    Item: putPlayer
                }
            })
        }
    }
    batchPutItems(process.env.PLAYER_TABLE, putRequests)

    putRequests = []
    for (let matchIndex = 0; matchIndex < dirtyMatches.length; ++matchIndex) {
        let newMatch = dirtyMatches[matchIndex]
        putRequests.push({
            PutRequest: {
                Item: newMatch
            }
        })
    }
    console.log("matches", putRequests)
    batchPutItems(process.env.MATCH_TABLE, putRequests)

    putRequests = []
    for (let battleIndex = 0; battleIndex < dirtyBattles.length; ++battleIndex) {
        let newBattle = dirtyBattles[battleIndex]
        putRequests.push({
            PutRequest: {
                Item: newBattle
            }
        })
    }
    console.log("battles", putRequests)
    batchPutItems(process.env.BATTLE_TABLE, putRequests)
}

async function batchPutItems(tableName, putRequests) {
    for (let i = 0; i < putRequests.length; i += 25) {
        let params = {
            RequestItems: {
                [tableName]: putRequests.slice(i, 25)
            }
        }
        await docClient.batchWrite(params).promise().catch((error) => {
            throw error
        })
    }
}

function getOrAddPlayer(matchPlayer, playerList) {
    let foundPlayer = playerList.find((x) => {
        return x.playerId === matchPlayer.playerId
    })
    if (foundPlayer !== undefined) {
        return foundPlayer
    } else {
        let newPlayer = {
            playerId: matchPlayer.playerId,
            rating: 400,
            battles: []
        }
        playerList.push(newPlayer)

        return newPlayer
    }
}

async function scanTable(tableName, projectionExpression, expressionAttributeNames) {
    let params = {
        TableName: tableName,
        ProjectionExpression: projectionExpression,
        ExpressionAttributeNames: expressionAttributeNames
    }

    let retItems = []
    let onScan = async (err, data) => {
        if (err) {
            throw `Error scaning ${tableName}. ` + err
        } else {
            retItems = retItems.concat(data.Items)

            if (data.LastEvaluatedKey !== undefined) {
                params.ExclusiveStartKey = data.LastEvaluatedKey
                await docClient.scan(params, onScan).promise()
            }
        }
    }

    await docClient.scan(params, onScan).promise()

    return retItems
}
