
let urls = {
    SETUP_NEW_EVENT: "{path}/setupNewEvent/{eventName}",
    SETUP_SET_CURRENT_EVENT: "{path}/setupSetCurrentEvent/{eventName}",
    SETUP_GET_EVENTS: "{path}/setupGetEvents",
    SETUP_GET_EVENT: "{path}/setupGetEvent/{eventName}",
    GET_CURRENT_EVENT_INFO: "{path}/getCurrentEventInfo"
}

function buildUrl(urlKey, pathParams, queryParams) {
    let path = __STAGE__ === "DEVELOPMENT" ? "https://6rcysbv7wb.execute-api.us-west-2.amazonaws.com/development" : "https://w0wkbj0dd9.execute-api.us-west-2.amazonaws.com"

    let pathReplaceData = {
        "path": path
    }

    Object.assign(pathReplaceData, pathParams)

    let url = urls[urlKey]
    for (let wildName in pathReplaceData) {
        url = url.replace(`{${wildName}}`, pathReplaceData[wildName])
    }

    let firstQueryParam = true
    for (let paramName in queryParams) {
        let prefix = firstQueryParam ? "?" : "&"
        firstQueryParam = false

        url += `${prefix}${paramName}=${queryParams[paramName]}`
    }

    return url
}

module.exports.fetchEx = function(key, pathParams, queryParams, options) {
    return fetch(buildUrl(key, pathParams, queryParams), options)
}
