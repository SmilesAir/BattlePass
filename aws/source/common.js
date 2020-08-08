
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
