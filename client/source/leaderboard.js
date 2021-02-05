"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const Common = require("./common.js")
const { fetchEx } = require("./endpoints.js")

require("./leaderboard.less")

module.exports = @MobxReact.observer class Leaderboard extends React.Component {
    constructor() {
        super()

        Common.updateEventInfoFromAws(true).then(() => {
            this.forceUpdate()

            fetchEx("GET_CURRENT_EVENT_LEADERBOARD", { eventName: MainStore.eventName }, undefined, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            }).then((response) => {
                return response.json()
            }).then((response) => {
                this.state = {
                    leaderboardData: response.leaderboardData
                }
                this.setState(this.state)
            })
        })
    }

    getLeaderboardElement() {
        if (this.state === null || this.state.leaderboardData === undefined) {
            return null
        }

        let players = []
        let rank = 0
        let lastRank = 1
        let lastPoints = undefined
        players = players.concat(this.state.leaderboardData.map((data) => {
            ++rank
            if (lastPoints !== data.points) {
                lastRank = rank
            }
            lastPoints = data.points

            return (
                <tr key={rank}>
                    <th className="playerRow">{lastRank}</th>
                    <th className="playerRow, playerName">{data.displayName}</th>
                    <th className="playerRow">{data.points}</th>
                </tr>
            )
        }))

        return (
            <table className="leaderboardTable">
                <thead>
                    <tr key={0}>
                        <th className="headerRow">Rank</th>
                        <th className="headerRow">Name</th>
                        <th className="headerRow">Points</th>
                    </tr>
                </thead>
                <tbody>
                    {players}
                </tbody>
            </table>
        )
    }

    render() {
        return (
            <div className="leaderboardContainer">
                <div className="title">{MainStore.eventName}</div>
                {this.getLeaderboardElement()}
            </div>
        )
    }
}
