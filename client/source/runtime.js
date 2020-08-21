"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const EventInfo = require("./eventInfo.js")
const Common = require("./common.js")

require("./runtime.less")

module.exports = @MobxReact.observer class Runtime extends React.Component {
    constructor() {
        super()

        Common.updateEventInfoFromAws().then(() => {
            this.forceUpdate()
        })
    }

    onSetMatch(id) {
        MainStore.currentMatch = id

        this.forceUpdate()
    }

    getExpandElement(id) {
        return (
            <button onClick={() => this.onSetMatch(id)}>Set</button>
        )
    }

    getMatchRuntime() {
        if (MainStore.currentMatch === undefined) {
            return null
        }

        return (
            <div>
                <div>Current Match: {MainStore.currentMatch}</div>
            </div>
        )
    }

    render() {
        return (
            <div>
                <EventInfo />
                {this.getMatchRuntime()}
                <MainStore.Reacket matches={MainStore.matches} isRuntime={true} getExpandElement={(id) => this.getExpandElement(id)} />
            </div>
        )
    }
}
