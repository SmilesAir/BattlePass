"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const Cheer = require("./cheer.js")
const Common = require("./common.js")

require("./overlay.less")

module.exports = @MobxReact.observer class Overlay extends React.Component {
    constructor() {
        super()

        Common.updateEventInfoFromAws(true).then(() => {
            this.forceUpdate()
        })

        setInterval(() => {
            Common.updateEventInfoFromAws(true)
        }, 1000)
    }

    render() {
        return (
            <div className="overlayContainer">
                {/* <div className="title">{MainStore.eventName}</div> */}
                <Cheer />
                {MainStore.url.searchParams.get("scoreboard") === "1" ? <Scoreboard /> : null}
                {MainStore.url.searchParams.get("playerInfo") === "1" ? <PlayerNameAndImage /> : null}
            </div>
        )
    }
}

@MobxReact.observer class PlayerNameAndImage extends React.Component {
    constructor() {
        super()
    }

    render() {
        let matchData = Common.getCurrentMatch()
        if (matchData === undefined) {
            return null
        }

        let currentPlayerIndex = Common.getCurrentBracket().currentPlayerIndex
        return (
            <div className="playerNameAndImage">
                <div
                    className="playerImage"
                    style={{
                        backgroundImage: `url("${matchData.reacket.players[currentPlayerIndex].imageUrl}")`,
                    }}
                />
                <div className="playerName">
                    {matchData.reacket.players[currentPlayerIndex].name}
                </div>
            </div>
        )
    }
}

@MobxReact.observer class Scoreboard extends React.Component {
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
            <div className="scoreboard" style={style}>
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
