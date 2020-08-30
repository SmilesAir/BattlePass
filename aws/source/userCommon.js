
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
        raffleTicketCount: 0
    }
}
