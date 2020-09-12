
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
                    ExpressionAttributeNames : {
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
        data: data
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
        raffleTicketCount: 0,
        picks: {}
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
        ExpressionAttributeNames : {
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
        ExpressionAttributeNames : {
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