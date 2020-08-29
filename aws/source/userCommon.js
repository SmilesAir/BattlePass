
const AWS = require('aws-sdk')
let docClient = new AWS.DynamoDB.DocumentClient()

const Common = require("./common.js")

module.exports.getUserData = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let username = event.requestContext.authorizer.jwt.claims.username
    let data = await getUserData(username)
    if (data !== undefined) {
        return {
            success: true,
            data: data
        }
    } else {
        data = {
            key: username,
            createdAt: Date.now(),
            raffleTicketCount: 10,
            isAdmin: false
        }

        let putParams = {
            TableName: process.env.USER_TABLE,
            Item: data
        }
        await docClient.put(putParams).promise().catch((error) => {
            throw error
        })

        return {
            success: true,
            data: data,
            createdNew: true,
        }
    }
})}

module.exports.upgradeUser = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    return "Does this work?"
})}

function getUserData(username) {
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
