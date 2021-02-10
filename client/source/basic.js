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
const BracketSelect = require("./bracketSelect.js")

require("./basic.less")

module.exports = @MobxReact.observer class Basic extends React.Component {
    constructor() {
        super()

        this.nextCheerString = ""

        this.state = {
            pickMatchId: undefined,
            pickMatchPlayers: undefined,
            pickIndex: undefined,
            showCheerPicker: false,
            cheerPlayerIndex: undefined
        }
    }

    componentDidMount() {
        this.updateFromAws()

        this.updateIntervalHandle = setInterval(() => {
            this.updateFromAws()
        }, 10000)
    }

    updateFromAws() {
        Common.updateEventInfoFromAws().then(() => {
            this.forceUpdate()

            this.update()
        })
    }

    componentWillUnmount() {
        clearInterval(this.updateIntervalHandle)
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
            <button onClick={() => this.onSetMatch(id, players)} disabled={hasTBD || locked}>Pick</button>
        )
    }

    onSetMatch(id, players) {
        this.state.pickMatchId = id
        this.state.pickMatchPlayers = players
        let pickData = MainStore.userData[MainStore.eventName].picks[`${Common.getViewingBracketName()}_${Common.reacketIdToDynamoId(id)}`]
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
            fetchAuth("UPDATE_PICK", { eventName: MainStore.eventName, bracketName: Common.getViewingBracketName(), matchId: Common.reacketIdToDynamoId(matchId), wager: wager }, undefined, {
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

                this.updateFromAws()
            }).catch((error) => {
                console.error("Failed to update match", error)
            })
        })

        MainStore.userData[MainStore.eventName].picks[`${Common.getViewingBracketName()}_${Common.reacketIdToDynamoId(this.state.pickMatchId)}`] = wager

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
            fetchAuth("COLLECT_REWARDS", { eventName: MainStore.eventName, displayName: MainStore.displayName }, undefined, {
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
        // if (Common.getUserTier() === 0) {
        //     return null
        // }

        if (!Common.areUncollectedRewards()) {
            return null
        }

        return (
            <div>
                <button className="collectRewardsButton" onClick={() => this.collectRewards()}>Collect Rewards</button>
            </div>
        )
    }

    sendCheer(playerIndex, type) {
        Common.consumeCheer()

        MainStore.Auth.currentAuthenticatedUser().then((data) => {
            fetchAuth("SEND_CHEER", { eventName: MainStore.eventName, displayName: MainStore.displayName, playerIndex: playerIndex, type: type }, undefined, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": data.signInUserSession.accessToken.jwtToken
                }
            }).catch((error) => {
                console.error("Failed to update match", error)
            })
        })

        this.update()
    }

    update() {
        if (this.updating !== true && (Common.getCheersRemaining() < MainStore.constants.maxCheers || this.nextCheerString.length > 0)) {
            this.forceUpdate()

            this.updating = true
            this.updateHandle = setTimeout(() => {
                this.updating = false
                this.update()
            }, 300)
        }
    }

    showCheerPicker(playerIndex) {
        this.state.cheerPlayerIndex = playerIndex
        this.state.showCheerPicker = true
        this.setState(this.state)
    }

    pickCheer(index) {
        this.state.showCheerPicker = false
        this.setState(this.state)
        this.sendCheer(this.state.cheerPlayerIndex, index)
    }

    getCheerPicker() {
        let className = `cheerPicker ${this.state.showCheerPicker ? "" : "cheerPickerHidden"}`
        let types = MainStore.cheerGifs.map((path, index) => {
            return <img className="cheerGif" key={index} src={path} onClick={() => this.pickCheer(index)} />
        })
        return (
            <div className={className}>
                {types}
            </div>
        )
    }

    getCheerElement() {
        let matchData = Common.getCurrentMatch()
        if (matchData === undefined) {
            return null
        }

        let nextCheerTime = Common.getTimeToNextEarnedCheer()
        this.nextCheerString = nextCheerTime !== undefined ? ` (Gain 1 cheer in ${Math.floor(nextCheerTime / 60000)}:${Math.floor(nextCheerTime / 1000 % 60).toString().padStart(2, "0")})` : ""
        let cheersRemaining = Common.getCheersRemaining()

        return (
            <div>
                <div>Remaining Cheers: {cheersRemaining}{this.nextCheerString}</div>
                <button onClick={() => this.showCheerPicker(matchData.reacket.players[0].id - 1)} disabled={cheersRemaining <= 0}>CHEER for {matchData.reacket.players[0].name}</button>
                <button onClick={() => this.showCheerPicker(matchData.reacket.players[1].id - 1)} disabled={cheersRemaining <= 0}>CHEER for {matchData.reacket.players[1].name}</button>
                {this.getCheerPicker()}
            </div>
        )
    }

    render() {
        let isFreeUser = Common.getUserTier() === 0
        return (
            <div>
                <Welcome />
                <Rewards />
                {this.getPickElement()}
                <div className="watchLinkContainer">
                    <a className="watchLink" href="https://www.frisbeeguru.com/tiny-room-battle-challenge-3-2021/" target="_blank">Watch Tiny Room Challenge 3</a>
                </div>
                <EventInfo />
                {this.getCollectRewardsElement()}
                <br />
                <BracketSelect />
                <MainStore.Reacket matches={MainStore.reacketMatches} showExpandElement={true} getExpandElement={(id, players) => this.getExpandElement(id, players)} />
                {/* {this.getCheerElement()} */}
            </div>
        )
    }
}
