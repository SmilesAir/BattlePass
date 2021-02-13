"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const EventInfo = require("./eventInfo.js")
const Common = require("./common.js")
const { fetchEx } = require("./endpoints.js")

require("./runtime.less")

module.exports = @MobxReact.observer class Runtime extends React.Component {
    constructor() {
        super()

        this.state = {}
    }

    componentDidMount() {
        Common.updateEventInfoFromAws().then(() => {
            this.forceUpdate()
        })

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
                this.setState(this.state)
            }
        })
    }

    getPlayerIdByAlias(inAlias) {
        let playerData = this.state.players.find((player) => {
            return player.aliases.find((alias) => {
                return alias.toLowerCase() === inAlias.toLowerCase()
            }) !== undefined
        })

        return playerData && playerData.playerId || "undefined"
    }

    onSetMatch(id) {
        MainStore.currentMatchId = id

        let reacketMatch = MainStore.reacketMatches.find((match) => {
            return match.id === MainStore.currentMatchId
        })

        fetchEx("SET_CURRENT_MATCH", {
            eventName: MainStore.eventName,
            bracketName: MainStore.currentBracket,
            matchId: Common.reacketIdToDynamoId(id),
            player1Id: this.getPlayerIdByAlias(reacketMatch.players[0].name),
            player2Id: this.getPlayerIdByAlias(reacketMatch.players[1].name)
        }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }).then(() => {
            Common.updateEventInfoFromAws().then(() => {
                this.forceUpdate()
            })
        }).catch((error) => {
            console.error("Failed to set current match", error)
        })

        Common.updateScores()
    }

    getExpandElement(id) {
        return (
            <button onClick={() => this.onSetMatch(id)}>Set</button>
        )
    }

    onRuntimePoint(playerIndex, pointDelta) {
        Common.getMatchResults()[Common.reacketIdToDynamoId(MainStore.currentMatchId)].score[playerIndex] += pointDelta

        Common.updateScores()

        let reacketMatch = MainStore.reacketMatches.find((match) => {
            return match.id === MainStore.currentMatchId
        })

        let currentMatch = Common.getCurrentMatch()
        let ratingMatchId = undefined
        if (currentMatch !== undefined) {
            ratingMatchId = currentMatch.results.ratingMatchId
        }

        fetchEx("UPDATE_MATCH_SCORE", {
            eventName: MainStore.eventName,
            bracketName: MainStore.currentBracket,
            matchId: Common.reacketIdToDynamoId(MainStore.currentMatchId),
            player1Id: this.getPlayerIdByAlias(reacketMatch.players[0].name),
            player2Id: this.getPlayerIdByAlias(reacketMatch.players[1].name),
            ratingMatchId: ratingMatchId || "undefined"
        }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                playerIndex: playerIndex,
                pointDelta: pointDelta
            })
        }).catch((error) => {
            console.error("Failed to update match", error)
        })
    }

    isCurrentMatchFinal() {
        return Common.getMatchResults()[Common.reacketIdToDynamoId(MainStore.currentMatchId)].isFinal
    }

    onFinalUpdate(isFinal) {
        Common.getMatchResults()[Common.reacketIdToDynamoId(MainStore.currentMatchId)].isFinal = isFinal

        Common.updateScores()

        fetchEx("UPDATE_MATCH_SCORE", { eventName: MainStore.eventName, bracketName: MainStore.currentBracket, matchId: Common.reacketIdToDynamoId(MainStore.currentMatchId) }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                isFinal: isFinal
            })
        }).catch((error) => {
            console.error("Failed to update match", error)
        })
    }

    isScoreAboveZero(playerIndex) {
        return Common.getMatchResults()[Common.reacketIdToDynamoId(MainStore.currentMatchId)].score[playerIndex] > 0
    }

    getRuntimeControls() {
        if (MainStore.currentMatchId !== undefined) {
            let reacketMatch = MainStore.reacketMatches.find((match) => {
                return match.id === MainStore.currentMatchId
            })
            if (reacketMatch !== undefined) {
                return (
                    <div>
                        <h2>{Common.getReacketIdFromString(MainStore.currentMatchId, MainStore.roundCount)}</h2>
                        <div>#{reacketMatch.players[0].seed} {reacketMatch.players[0].name}: {reacketMatch.score[0]}</div>
                        <button className="scoreButton" onClick={() => this.onRuntimePoint(0, 1)}>+</button>
                        <button className="scoreButton" onClick={() => this.onRuntimePoint(0, -1)} disabled={!this.isScoreAboveZero(0)}>-</button>
                        <div>#{reacketMatch.players[1].seed} {reacketMatch.players[1].name}: {reacketMatch.score[1]}</div>
                        <button className="scoreButton" onClick={() => this.onRuntimePoint(1, 1)}>+</button>
                        <button className="scoreButton" onClick={() => this.onRuntimePoint(1, -1)} disabled={!this.isScoreAboveZero(1)}>-</button>
                        <div>Finalize</div>
                        <button className="finalizeButton" onClick={() => this.onFinalUpdate(!this.isCurrentMatchFinal())}>{ this.isCurrentMatchFinal() ? "Unfinalize Match" : "Finalize Match" }</button>
                    </div>
                )
            }
        }

        return null
    }

    render() {
        return (
            <div>
                <EventInfo />
                {this.getRuntimeControls()}
                <MainStore.Reacket matches={MainStore.reacketMatches} showExpandElement={true} getExpandElement={(id) => this.getExpandElement(id)} />
            </div>
        )
    }
}
