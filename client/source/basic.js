/* eslint-disable no-alert */
"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const EventInfo = require("./eventInfo.js")
const { fetchAuth } = require("./endpoints.js")
const Common = require("./common.js")
const Welcome = require("./welcome.js")
const Rewards = require("./rewards.js")

require("./basic.less")

module.exports = @MobxReact.observer class Basic extends React.Component {
    constructor() {
        super()

        Common.updateEventInfoFromAws().then(() => {
            this.forceUpdate()
        })

        this.state = {
            pickMatchId: undefined,
            pickMatchPlayers: undefined,
            pickIndex: undefined
        }
    }

    getExpandElement(id, players) {
        if (players === undefined) {
            return null
        }

        let matchResultData = Common.getMatchResults()[Common.reacketIdToDynamoId(id)]
        let locked = matchResultData === undefined || matchResultData.isPickable !== true

        let hasTBD = players.find((player) => {
            return player.name === "TBD"
        }) !== undefined

        return (
            <button onClick={() => this.onSetMatch(id, players)} disabled={hasTBD || locked}>Bet</button>
        )
    }

    onSetMatch(id, players) {
        this.state.pickMatchId = id
        this.state.pickMatchPlayers = players
        let pickData = MainStore.userData[MainStore.eventName].picks[`${MainStore.currentBracket}_${Common.reacketIdToDynamoId(id)}`]
        if (pickData === undefined) {
            this.state.pickIndex = undefined
        } else {
            this.state.pickIndex = pickData > 0 ? 1 : 0
        }
        this.setState(this.state)
    }

    onPick(event) {
        let wager = parseInt(event.target.value, 10) > 0 ? 1 : -1
        let matchId = this.state.pickMatchId

        MainStore.Auth.currentAuthenticatedUser().then((data) => {
            fetchAuth("UPDATE_PICK", { eventName: MainStore.eventName, bracketName: MainStore.currentBracket, matchId: Common.reacketIdToDynamoId(matchId), wager: wager }, undefined, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": data.signInUserSession.accessToken.jwtToken
                }
            }).then((response) => {
                return response.json()
            }).then((response) => {
                if (response.isNotPickable) {
                    alert("Match has already been locked. No Bet placed.")
                }
            }).catch((error) => {
                console.error("Failed to update match", error)
            })
        })

        MainStore.userData[MainStore.eventName].picks[`${MainStore.currentBracket}_${Common.reacketIdToDynamoId(this.state.pickMatchId)}`] = wager

        this.state.pickIndex = undefined
        this.state.pickMatchId = undefined
        this.setState(this.state)
    }

    getPickElement() {
        if (this.state.pickMatchId === undefined) {
            return null
        }

        let options = []
        options = this.state.pickMatchPlayers.map((player, index) => {
            return (
                <div key={player.name}>
                    <label>
                        <input type="radio" value={index} checked={index === this.state.pickIndex} onChange={(event) => this.onPick(event)}/>
                        {player.name}
                    </label>
                </div>
            )
        })

        return (
            <div className="pickContainer">
                <div>
                    Pick the winner
                </div>
                <form>
                    {options}
                </form>
            </div>
        )
    }

    collectRewards() {
        MainStore.Auth.currentAuthenticatedUser().then((data) => {
            fetchAuth("COLLECT_REWARDS", { eventName: MainStore.eventName }, undefined, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": data.signInUserSession.accessToken.jwtToken
                }
            }).then((response) => {
                return response.json()
            }).then((response) => {
                console.log("rewards", response.rewards)

                if (response.rewards !== undefined) {
                    Common.updateEventInfoFromAws().then(() => {
                        this.forceUpdate()
                    })

                    Common.fillUserData()

                    MainStore.showRewards = true
                    MainStore.rewards = response.rewards
                }
            }).catch((error) => {
                console.error("Failed to update match", error)
            })
        })
    }

    getCollectRewardsElement() {
        if (Common.getUserTier() === 0) {
            return null
        }

        if (!Common.areUncollectedRewards()) {
            return null
        }

        return <button onClick={() => this.collectRewards()}>Collect Rewards</button>
    }

    render() {
        let isFreeUser = Common.getUserTier() === 0
        return (
            <div>
                <Welcome />
                <Rewards />
                {this.getPickElement()}
                <EventInfo />
                <MainStore.Reacket matches={MainStore.reacketMatches} showExpandElement={!isFreeUser} getExpandElement={(id, players) => this.getExpandElement(id, players)} />
                {this.getCollectRewardsElement()}
            </div>
        )
    }
}
