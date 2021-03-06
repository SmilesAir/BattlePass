
const AWS = require('aws-sdk')
let docClient = new AWS.DynamoDB.DocumentClient()

module.exports.handler = async function(event, context, callback, func) {
    try {
        let result = await func(event, context)

        let successResponse = {
            statusCode: 200,
            headers: {
            "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
            "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
            },
            body: JSON.stringify(result)
        }

        callback(null, successResponse)
    } catch (error) {
        console.log(`Handler Catch: ${error}`)

        let failResponse = {
            statusCode: 500,
            headers: {
              "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
              "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
            },
            body: error
        }

        callback(failResponse)
    }
}

module.exports.isEmptyObject = function(obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object
}

module.exports.awardRaffleTickets = function(eventName, username, count) {
    let params = {
        TableName: process.env.USER_TABLE,
        Key: {"key": username},
        UpdateExpression: `set #eventName.raffleTicketCount = #eventName.raffleTicketCount + :count`,
        ExpressionAttributeNames: {
            "#eventName": eventName
        },
        ExpressionAttributeValues: {
            ":count": count
        },
        ReturnValues: "NONE"
    }
    return docClient.update(params).promise().then(() => {
        let eventUpdateParams = {
            TableName: process.env.EVENT_TABLE,
            Key: {"key": eventName},
            UpdateExpression: "set raffleTicketCount = raffleTicketCount + :count",
            ExpressionAttributeValues: {
                ":count": count
            },
            ReturnValues: "NONE"
        }
        return docClient.update(eventUpdateParams).promise()
    }).catch((error) => {
        throw error
    })
}
