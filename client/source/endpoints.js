
let urls = {
    SETUP_NEW_EVENT: "{path}/setupNewEvent/{eventName}",
    SETUP_NEW_BRACKET: "{path}/setupNewBracket/{eventName}/bracket/{bracketName}",
    SETUP_SET_CURRENT_EVENT: "{path}/setupSetCurrentEvent/{eventName}",
    SETUP_SET_CURRENT_BRACKET: "{path}/setupSetCurrentBracket/{eventName}/bracket/{bracketName}",
    SETUP_GET_EVENTS: "{path}/setupGetEvents",
    SETUP_GET_EVENT: "{path}/setupGetEvent/{eventName}",
    GET_CURRENT_EVENT_INFO: "{path}/getCurrentEventInfo",
    SET_CURRENT_MATCH: "{path}/setCurrentMatch/{eventName}/bracket/{bracketName}/matchId/{matchId}",
    UPDATE_MATCH_SCORE: "{path}/updateMatchScore/{eventName}/bracket/{bracketName}/matchId/{matchId}",
    GET_USER_DATA: "{path}/getUserData",
    UPDATE_PICK: "{path}/updatePick/{eventName}/bracket/{bracketName}/matchId/{matchId}/wager/{wager}",
    COLLECT_REWARDS: "{path}/collectRewards/{eventName}"
}

function buildUrl(isAuth, urlKey, pathParams, queryParams) {
    let path = undefined
    if (isAuth) {
        path = __STAGE__ === "DEVELOPMENT" ? "https://odnou7cv5a.execute-api.us-west-2.amazonaws.com" : "https://w0wkbj0dd9.execute-api.us-west-2.amazonaws.com"
    } else {
        path = __STAGE__ === "DEVELOPMENT" ? "https://6rcysbv7wb.execute-api.us-west-2.amazonaws.com/development" : "https://w0wkbj0dd9.execute-api.us-west-2.amazonaws.com"
    }

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
    return fetch(buildUrl(false, key, pathParams, queryParams), options)
}

module.exports.fetchAuth = function(key, pathParams, queryParams, options) {
    return fetch(buildUrl(true, key, pathParams, queryParams), options)
}
