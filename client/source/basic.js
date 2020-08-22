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

        Common.updateEventInfoFromAws().then(() => {
            this.forceUpdate()
        })
    }

    render() {
        return (
            <div>
                <EventInfo />
                <MainStore.Reacket matches={MainStore.reacketMatches} />
            </div>
        )
    }
}
