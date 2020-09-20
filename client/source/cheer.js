"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")

require("./cheer.less")

module.exports = @MobxReact.observer class Cheer extends React.Component {
    constructor() {
        super()

        this.state = {
            cheerCount: 0,
            eventDataInited: false,
            cheersToShow: [],
            showCheer: false,
            playerName: undefined,
            displayName: undefined,
            type: undefined
        }

        MainStore.eventDataUpdatedCallbacks.push((eventData) => this.onEventDataUpdated(eventData))
    }

    onEventDataUpdated(eventData) {
        let newCheerCount = eventData.cheers.length
        if (this.state.eventDataInited === false) {
            this.state.eventDataInited = true
            this.state.cheerCount = newCheerCount
            this.setState(this.state)
        } else if (this.state.cheerCount !== newCheerCount) {
            this.state.cheersToShow = this.state.cheersToShow.concat(eventData.cheers.slice(this.state.cheerCount))
            this.state.cheerCount = newCheerCount
            this.setState(this.state)

            this.showNextCheer()
        }
    }

    showNextCheer() {
        if (this.state.cheersToShow.length > 0) {
            let cheerData = this.state.cheersToShow[0]
            this.state.showCheer = true
            this.state.playerName = MainStore.namesArray[cheerData.p]
            this.state.displayName = cheerData.u
            this.state.type = cheerData.t
            this.state.cheersToShow = this.state.cheersToShow.slice(1)
            this.setState(this.state)

            setTimeout(() => {
                this.endCheer()
            }, 2000)
        }
    }

    endCheer() {
        this.state.showCheer = false
        this.setState(this.state)

        setTimeout(() => {
            this.showNextCheer()
        }, 500)
    }

    render() {
        if (this.state.showCheer !== true) {
            return null
        }

        return (
            <div className="cheerContainer">
                {this.state.displayName} send a cheer for {this.state.playerName}. Type {this.state.type}
            </div>
        )
    }
}
