const AWS = require('aws-sdk')
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
                throw new "Trying to overwrite locked event"
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

    if (eventData.brackets !== undefined && eventData.brackets[bracketName].isLocked === true) {
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

    console.log(event.pathParameters)

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
            console.log("No events")

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

    console.log(getParams)

    return docClient.get(getParams).promise().then((response) => {
        console.log(response)
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

    let params = {
        TableName: process.env.EVENT_TABLE,
        Key: {"key": eventName},
        UpdateExpression: "set brackets.#bracketName.currentMatchId = :id",
        ExpressionAttributeNames: {
            "#bracketName": bracketName
        },
        ExpressionAttributeValues: {
            ":id": matchId
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
    let request = JSON.parse(event.body) || {}

    // let sns = new AWS.SNS()
    // let snsParams = {
    //     Message: "Does this work?",
    //     Subject: "test subject",
    //     TopicArn: process.env.SNS_TOPIC_ARN
    // }
    // await sns.publish(snsParams).promise().catch((error) => {
    //     console.log("sns error", error)
    // })

    if (request.isFinal !== undefined) {
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
            console.log("response", JSON.stringify(resp))
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
        let params = {
            TableName: process.env.EVENT_TABLE,
            Key: {"key": eventName},
            UpdateExpression: `set brackets.#bracketName.results.#matchId.score[${request.playerIndex}] = brackets.#bracketName.results.#matchId.score[${request.playerIndex}] + :pointDelta, brackets.#bracketName.results.#matchId.isPickable = :false`,
            ExpressionAttributeNames: {
                "#bracketName": bracketName,
                "#matchId": matchId
            },
            ExpressionAttributeValues: {
                ":pointDelta": request.pointDelta,
                ":false": false
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
            throw new "Error scaning player points for leaderboard. " + err
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
