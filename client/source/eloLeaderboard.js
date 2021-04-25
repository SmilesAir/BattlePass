"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const Common = require("./common.js")
const { fetchEx } = require("./endpoints.js")

require("./eloLeaderboard.less")

module.exports = @MobxReact.observer class eloLeaderboard extends React.Component {
    constructor() {
        super()

        this.state = {
            players: []
        }

        fetchEx("GET_PLAYERS", undefined, undefined, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => {
            return response.json()
        }).then((response) => {
            if (response.success) {
                this.state.players = response.players
                this.state.players.sort((a, b) => b.rating - a.rating)
                this.setState(this.state)

                console.log(this.state.players)
            }
        })
    }

    getLeaderboardElement() {
        if (this.state === null || this.state.players === undefined) {
            return null
        }

        let players = []
        let rank = 0
        let lastRank = 1
        let lastrating = undefined
        players = this.state.players.map((data) => {
            ++rank
            if (lastrating !== data.rating) {
                lastRank = rank
            }
            lastrating = data.rating

            return (
                <tr key={rank}>
                    <th className="playerRow">{lastRank}</th>
                    <th className="playerRow, playerName">{data.aliases[0]}</th>
                    <th className="playerRow">{Math.round(data.rating)}</th>
                </tr>
            )
        })

        return (
            <table className="eloLeaderboardTable">
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
            <div className="eloLeaderboardContainer">
                <div className="title">Player Ratings</div>
                {this.getLeaderboardElement()}
            </div>
        )
    }
}
