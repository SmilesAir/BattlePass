const AWS = require('aws-sdk')
let docClient = new AWS.DynamoDB.DocumentClient()

const Common = require("./common.js")

module.exports.setupNewEvent = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let request = JSON.parse(event.body) || {}
    let eventName = decodeURIComponent(event.pathParameters.eventName)

    let getParams = {
        TableName: process.env.EVENT_TABLE,
        Key: {"key": eventName}
    }
    await docClient.get(getParams).promise().then((response) => {
        if (!Common.isEmptyObject(response)) {
            if (response.Item.locked !== true) {
                return createNewEvent(eventName, request.names, request.results)
            } else {
                throw new "Trying to overwrite locked event"
            }
        } else {
            return createNewEvent(eventName, request.names, request.results)
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

function createNewEvent(eventName, names, results) {
    let putParams = {
        TableName : process.env.EVENT_TABLE,
        Item: {
            key: eventName,
            eventName: eventName,
            createdTime: Date.now(),
            names: names,
            results: results,
            raffleTicketCount: 0
        }
    }

    return docClient.put(putParams).promise()
}

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
        return {
            success: true,
            info: response.Item
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

module.exports.setupSetCurrentEvent = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventName = decodeURIComponent(event.pathParameters.eventName)

    let eventInfo = await getEventInfo(eventName)
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

function getEventInfo(eventName) {
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

    return getEventInfo(eventName)
})}

module.exports.setCurrentMatch = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventName = decodeURIComponent(event.pathParameters.eventName)
    let matchId = decodeURIComponent(event.pathParameters.matchId)

    let params = {
        TableName: process.env.EVENT_TABLE,
        Key: {"key": eventName},
        UpdateExpression: "set currentMatchId = :id",
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
    let matchId = decodeURIComponent(event.pathParameters.matchId)
    let request = JSON.parse(event.body) || {}

    if (request.isFinal !== undefined) {
        let params = {
            TableName: process.env.EVENT_TABLE,
            Key: {"key": eventName},
            UpdateExpression: `set results.#matchId.isFinal = :isFinal`,
            ExpressionAttributeNames: {
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
            UpdateExpression: `set results.#matchId.score[${request.playerIndex}] = results.#matchId.score[${request.playerIndex}] + :pointDelta`,
            ExpressionAttributeNames: {
                "#matchId": matchId
            },
            ExpressionAttributeValues: {
                ":pointDelta": request.pointDelta
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
