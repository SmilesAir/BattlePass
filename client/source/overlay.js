"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const Cheer = require("./cheer.js")
const Common = require("./common.js")

require("./overlay.less")

module.exports = @MobxReact.observer class Runtime extends React.Component {
    constructor() {
        super()

        Common.updateEventInfoFromAws().then(() => {
            this.forceUpdate()
        })

        setInterval(() => {
            Common.updateEventInfoFromAws()
        }, 1000)
    }

    render() {
        return (
            <div className="overlayContainer">
                <div className="title">{MainStore.eventName}</div>
                <Cheer />
                <Bracket />
            </div>
        )
    }
}

@MobxReact.observer class Bracket extends React.Component {
    constructor() {
        super()
    }

    render() {
        let matchData = Common.getCurrentMatch()
        if (matchData === undefined) {
            return null
        }

        let params = MainStore.url.searchParams
        let style = {
            "left": `${params.get("left")}%`,
            "right": `${params.get("right")}%`,
            "top": `${params.get("top")}%`,
            "bottom": `${params.get("bottom")}%`
        }
        let wagerTotal = matchData.results.wagerTotals[0] + matchData.results.wagerTotals[1]
        let odds0 = wagerTotal === 0 ? "50%" : `${Math.round(matchData.results.wagerTotals[0] / wagerTotal * 100).toFixed()}%`
        let odds1 = wagerTotal === 0 ? "50%" : `${Math.round(matchData.results.wagerTotals[1] / wagerTotal * 100).toFixed()}%`
        return (
            <div className="bracket" style={style}>
                <div className="row">
                    <div className="desc">{Common.idToPrettyName(matchData.reacket.id)}</div>
                </div>
                <div className="rowLine" />
                <div className="row">
                    <div className="name">{matchData.reacket.players[0].name}</div>
                    <div className="score">{matchData.results.score[0]}</div>
                    <div className="odds">{odds0}</div>
                </div>
                <div className="rowLine" />
                <div className="row">
                    <div className="name">{matchData.reacket.players[1].name}</div>
                    <div className="score">{matchData.results.score[1]}</div>
                    <div className="odds">{odds1}</div>
                </div>
            </div>
        )
    }
}
