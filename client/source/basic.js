"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const EventInfo = require("./eventInfo.js")
const { fetchEx } = require("./endpoints.js")
const Common = require("./common.js")

require("./basic.less")

module.exports = @MobxReact.observer class Basic extends React.Component {
    constructor() {
        super()

        fetchEx("GET_CURRENT_EVENT_INFO", undefined, undefined, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((eventResponse) => {
            return eventResponse.json()
        }).then((eventResponse) => {
            Common.updateBracketFromNames(eventResponse.info.names)
            this.forceUpdate()
        })
    }

    render() {
        return (
            <div>
                <EventInfo />
                <MainStore.Reacket matches={MainStore.matches} />
            </div>
        )
    }
}
