
const AWS = require('aws-sdk')
let docClient = new AWS.DynamoDB.DocumentClient()

const Common = require("./common.js")
const EventCommon = require("./eventCommon.js")

module.exports.getUserData = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let username = event.requestContext.authorizer.jwt.claims.username

    let masterInfo = await EventCommon.getMasterInfo()
    let currentEventName = masterInfo && masterInfo.data && masterInfo.data.current

    let createdNew = false
    let data = await getUserItem(username)
    if (data === undefined) {
        createdNew = true

        data = {
            key: username,
            createdAt: Date.now(),
            isAdmin: false
        }

        if (currentEventName !== undefined) {
            data[currentEventName] = getNewEventData()
        }

        let putParams = {
            TableName: process.env.USER_TABLE,
            Item: data
        }
        await docClient.put(putParams).promise().catch((error) => {
            throw error
        })
    } else {
        if (currentEventName !== undefined) {
            if (data[currentEventName] === undefined) {
                data[currentEventName] = getNewEventData()

                let updateParams = {
                    TableName: process.env.USER_TABLE,
                    Key: {"key": username},
                    UpdateExpression: "set #eventName = :data",
                    ExpressionAttributeNames: {
                        "#eventName": currentEventName
                    },
                    ExpressionAttributeValues: {
                        ":data": data[currentEventName]
                    },
                    ReturnValues: "NONE"
                }
                await docClient.update(updateParams).promise().catch((error) => {
                    throw error
                })
            }
        }
    }

    return {
        success: true,
        data: data,
        createdNew: createdNew
    }
})}

module.exports.upgradeUser = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    return "Does this work?"
})}

function getUserItem(username) {
    let getParams = {
        TableName: process.env.USER_TABLE,
        Key: {"key": username}
    }

    return docClient.get(getParams).promise().then((response) => {
        if (!Common.isEmptyObject(response)) {
            return response.Item
        }

        return undefined
    }).catch((error) => {
        throw error
    })
}

function getNewEventData() {
    return {
        createdAt: Date.now(),
        points: 0,
        raffleTicketCount: 0,
        picks: {},
        processed: {},
        tier: 0,
        cheersRemaining: 0
    }
}

module.exports.updatePick = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let username = event.requestContext.authorizer.jwt.claims.username
    let eventName = decodeURIComponent(event.pathParameters.eventName)
    let bracketName = decodeURIComponent(event.pathParameters.bracketName)
    let matchId = decodeURIComponent(event.pathParameters.matchId)
    let wager = parseInt(decodeURIComponent(event.pathParameters.wager))

    let userData = await getUserItem(username)
    if (userData === undefined) {
        throw "Can't find user " + username
    }

    let pickId = `${bracketName}_${matchId}`
    let pickData = userData[eventName].picks[pickId]
    if (pickData === wager) {
        return {
            success: true
        }
    }

    let eventInfo = await EventCommon.getEventInfo(eventName)
    if (eventInfo === undefined) {
        throw "Can't find event " + eventName
    }

    let matchData = eventInfo.brackets[bracketName].results[matchId]
    if (matchData.isPickable !== true) {
        return {
            success: false,
            isNotPickable: true,
            message: "isPickable is false"
        }
    }

    let userUpdateParams = {
        TableName: process.env.USER_TABLE,
        Key: {"key": username},
        UpdateExpression: "set #eventName.picks.#pickId = :wager",
        ExpressionAttributeNames: {
            "#eventName": eventName,
            "#pickId": pickId
        },
        ExpressionAttributeValues: {
            ":wager": wager
        },
        ReturnValues: "NONE"
    }
    await docClient.update(userUpdateParams).promise().catch((error) => {
        throw error
    })

    let delta0 = 0
    let delta1 = 0
    if (pickData === undefined) {
        if (wager > 0) {
            delta1 = wager
        } else {
            delta0 = -wager
        }
    } else {
        if (wager > 0) {
            delta0 = -wager
            delta1 = wager
        } else {
            delta0 = wager
            delta1 = -wager
        }
    }

    let eventUpdateParams = {
        TableName: process.env.EVENT_TABLE,
        Key: {"key": eventName},
        UpdateExpression: "set brackets.#bracketName.results.#matchId.wagerTotals[0] = brackets.#bracketName.results.#matchId.wagerTotals[0] + :delta0, brackets.#bracketName.results.#matchId.wagerTotals[1] = brackets.#bracketName.results.#matchId.wagerTotals[1] + :delta1",
        ExpressionAttributeNames: {
            "#bracketName": bracketName,
            "#matchId": matchId
        },
        ExpressionAttributeValues: {
            ":delta0": delta0,
            ":delta1": delta1
        },
        ReturnValues: "NONE"
    }
    await docClient.update(eventUpdateParams).promise().catch((error) => {
        throw error
    })

    return {
        success: true
    }
})}

module.exports.collectRewards = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let username = event.requestContext.authorizer.jwt.claims.username
    let eventName = decodeURIComponent(event.pathParameters.eventName)

    let userData = await getUserItem(username)
    if (userData === undefined) {
        throw "Can't find user " + username
    }

    let unprocessed = []
    let userEventData = userData[eventName]
    for (let pick in userEventData.picks) {
        if (userEventData.processed[pick] === undefined) {
            unprocessed.push({
                pickId: pick,
                wager: userEventData.picks[pick]
            })
        }
    }

    if (unprocessed.length === 0) {
        return {
            success: true
        }
    } else {
        let eventInfo = await EventCommon.getEventInfo(eventName)
        if (eventInfo === undefined) {
            throw "Can't find event " + eventName
        }

        let newProcessed = []
        let rewards = {
            raffleTicketCount: 0,
            points: 0
        }
        for (let pickKey in unprocessed) {
            let pick = unprocessed[pickKey]
            let bracketName = pick.pickId.split(/_(.+)/)[0]
            let matchId = pick.pickId.split(/_(.+)/)[1]
            let matchData = eventInfo.brackets[bracketName].results[matchId]
            if (matchData.isFinal === true) {
                newProcessed.push(pick.pickId)

                let scoreDelta  = matchData.score[1] - matchData.score[0]
                let isWin = scoreDelta > 0 && pick.wager > 0 || scoreDelta < 0 && pick.wager < 0
                if (isWin) {
                    rewards.raffleTicketCount += 10
                    rewards.points += 100
                }
            }
        }

        await Common.awardRaffleTickets(eventName, username, rewards.raffleTicketCount)

        if (newProcessed.length > 0) {
            let names = {
                "#eventName": eventName,
                "#processed": "processed"
            }
            let exp = "set " + newProcessed.map((pickId, index) => {
                names[`#pickId${index}`] = pickId
                return `#eventName.#processed.#pickId${index} = :now`
            }).join(", ")
            exp += ", #eventName.points = #eventName.points + :points"

            let userUpdateParams = {
                TableName: process.env.USER_TABLE,
                Key: {"key": username},
                UpdateExpression: exp,
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: {
                    ":now": Date.now(),
                    ":points": rewards.points
                },
                ReturnValues: "NONE"
            }
            await docClient.update(userUpdateParams).promise().catch((error) => {
                throw error
            })
        }

        return {
            success: true,
            rewards: rewards
        }
    }
})}

module.exports.redeemCode = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let username = event.requestContext.authorizer.jwt.claims.username
    let code = decodeURIComponent(event.pathParameters.code)

    let getParams = {
        TableName: process.env.CODE_TABLE,
        Key: {"key": code}
    }
    let codeData = await docClient.get(getParams).promise().then((response) => {
        if (!Common.isEmptyObject(response)) {
            return response.Item
        }

        return undefined
    }).catch((error) => {
        throw error
    })

    if (codeData === undefined) {
        return {
            success: false,
            noCodeFound: true
        }
    }

    if (codeData.claimedBy !== undefined) {
        return {
            success: false,
            alreadyClaimedBy: codeData.claimedBy
        }
    }

    let updateParams = {
        TableName: process.env.CODE_TABLE,
        Key: {"key": code},
        UpdateExpression: "set claimedAt = :now, claimedBy = :claimbedBy",
        ExpressionAttributeValues: {
            ":now": Date.now(),
            ":claimbedBy": username
        },
        ReturnValues: "NONE"
    }
    await docClient.update(updateParams).promise().catch((error) => {
        throw error
    })

    await upgradeUser(codeData.eventName, username, 1)

    return {
        success: true,
        codeData: codeData
    }
})}

function upgradeUser(eventName, username, tier) {
    let userUpdateParams = {
        TableName: process.env.USER_TABLE,
        Key: {"key": username},
        UpdateExpression: "set #eventName.tier = :tier, #eventName.cheersRemaining = :cheers",
        ExpressionAttributeNames: {
            "#eventName": eventName
        },
        ExpressionAttributeValues: {
            ":tier": tier,
            ":cheers": 10
        },
        ReturnValues: "NONE"
    }
    return docClient.update(userUpdateParams).promise().catch((error) => {
        throw error
    })
}

module.exports.setupCreateCode = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let username = event.requestContext.authorizer.jwt.claims.username
    let eventName = decodeURIComponent(event.pathParameters.eventName)
    let code = decodeURIComponent(event.pathParameters.code)

    let userData = await getUserItem(username)
    if (userData === undefined) {
        throw "Can't find this admin user"
    }

    if (userData.isAdmin !== true) {
        throw "This user is not an Admin"
    }

    let params = {
        TableName: process.env.CODE_TABLE,
        Item: {
            key: code,
            createdAt: Date.now(),
            eventName: eventName
        }
    }
    await docClient.put(params).promise().catch((error) => {
        throw error
    })

    return {
        success: true
    }
})}

module.exports.sendCheer = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let username = event.requestContext.authorizer.jwt.claims.username
    let eventName = decodeURIComponent(event.pathParameters.eventName)
    let displayName = decodeURIComponent(event.pathParameters.displayName)
    let playerIndex = decodeURIComponent(event.pathParameters.playerIndex)
    let type = decodeURIComponent(event.pathParameters.type)

    let userData = await getUserItem(username)
    if (userData === undefined) {
        throw "Can't find this user"
    }

    let userEventData = userData[eventName]
    if (userEventData === undefined) {
        throw "No user event data for " + eventName
    }

    if (userEventData.cheersRemaining <= 0) {
        throw "No cheers remaining"
    }

    let userUpdateParams = {
        TableName: process.env.USER_TABLE,
        Key: {"key": username},
        UpdateExpression: "set #eventName.cheersRemaining = #eventName.cheersRemaining + :negOne",
        ExpressionAttributeNames: {
            "#eventName": eventName
        },
        ExpressionAttributeValues: {
            ":negOne": -1
        },
        ReturnValues: "NONE"
    }
    await docClient.update(userUpdateParams).promise().catch((error) => {
        throw error
    })

    let eventUpdateParams = {
        TableName: process.env.EVENT_TABLE,
        Key: {"key": eventName},
        UpdateExpression: "set cheers = list_append(cheers, :cheers)",
        ExpressionAttributeValues: {
            ":cheers": [{
                p: playerIndex,
                u: displayName,
                t: type
            }]
        },
        ReturnValues: "NONE"
    }
    await docClient.update(eventUpdateParams).promise().catch((error) => {
        throw error
    })

    return {
        success: true
    }
})}
