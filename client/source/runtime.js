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

        Common.updateEventInfoFromAws().then(() => {
            this.forceUpdate()
        })
    }

    onSetMatch(id) {
        MainStore.currentMatchId = id

        fetchEx("SET_CURRENT_MATCH", { eventName: MainStore.eventName, bracketName: MainStore.currentBracket, matchId: Common.reacketIdToDynamoId(id) }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
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

        fetchEx("UPDATE_MATCH_SCORE", { eventName: MainStore.eventName, bracketName: MainStore.currentBracket, matchId: Common.reacketIdToDynamoId(MainStore.currentMatchId) }, undefined, {
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
                        <h2>{MainStore.currentMatchId}</h2>
                        <div>{reacketMatch.players[0].name}</div>
                        <button onClick={() => this.onRuntimePoint(0, 1)}>+</button>
                        <button onClick={() => this.onRuntimePoint(0, -1)} disabled={!this.isScoreAboveZero(0)}>-</button>
                        <div>{reacketMatch.players[1].name}</div>
                        <button onClick={() => this.onRuntimePoint(1, 1)}>+</button>
                        <button onClick={() => this.onRuntimePoint(1, -1)} disabled={!this.isScoreAboveZero(1)}>-</button>
                        <div>Finalize</div>
                        <button onClick={() => this.onFinalUpdate(!this.isCurrentMatchFinal())}>{ this.isCurrentMatchFinal() ? "Unfinalize Match" : "Finalize Match" }</button>
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
                <MainStore.Reacket matches={MainStore.reacketMatches} isRuntime={true} getExpandElement={(id) => this.getExpandElement(id)} />
            </div>
        )
    }
}
