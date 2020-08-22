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

        fetchEx("SET_CURRENT_MATCH", { eventName: MainStore.eventName, matchId: Common.reacketIdToDynamoId(id) }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }).catch((error) => {
            console.error("Failed to set current match", error)
        })

        this.forceUpdate()
    }

    getExpandElement(id) {
        return (
            <button onClick={() => this.onSetMatch(id)}>Set</button>
        )
    }

    onRuntimePoint(playerIndex, pointDelta) {
        MainStore.matchResults[Common.reacketIdToDynamoId(MainStore.currentMatchId)].score[playerIndex] += pointDelta

        Common.updateScores()
    }

    onFinalize() {
        MainStore.matchResults[Common.reacketIdToDynamoId(MainStore.currentMatchId)].isFinal = true

        Common.updateScores()
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
                        <button onClick={() => this.onRuntimePoint(0, -1)}>-</button>
                        <div>{reacketMatch.players[1].name}</div>
                        <button onClick={() => this.onRuntimePoint(1, 1)}>+</button>
                        <button onClick={() => this.onRuntimePoint(1, -1)}>-</button>
                        <div>Finalize</div>
                        <button onClick={() => this.onFinalize()}>Finalize Match</button>
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
