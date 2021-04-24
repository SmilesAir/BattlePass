/* eslint-disable no-alert */
"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const EventInfo = require("./eventInfo.js")
const Common = require("./common.js")
const { fetchEx } = require("./endpoints.js")

require("./eloEditor.less")

module.exports = @MobxReact.observer class EloEditor extends React.Component {
    constructor() {
        super()

        this.searchHandle = undefined

        this.state = {
            newAlias: "",
            searchPlayerMatches: [],
            matchId: undefined,
            lastInputLocation: undefined,
            time: new Date()
        }
    }

    componentDidMount() {
        Common.updateEventInfoFromAws().then(() => {
            this.forceUpdate()
        })

        this.fetchPlayers()
    }

    fetchPlayers() {
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

    onNewAliasChanged(event) {
        this.state.newAlias = event.target.value
        this.setState(this.state)

        this.startSearch(event.target.value)
    }

    onNewPlayerChanged(event) {
        this.state.newPlayer = event.target.value
        this.setState(this.state)

        this.startSearch(event.target.value)
    }

    startSearch(text) {
        if (this.searchHandle !== undefined) {
            clearTimeout(this.searchHandle)
        }

        if (text.length === 0) {
            this.state.searchPlayerMatches = []
            this.setState(this.state)

            return
        }

        this.searchHandle = setTimeout(() => {
            let textLower = text.toLowerCase()
            this.state.searchPlayerMatches = []
            this.setState(this.state)
            let matchCount = 0
            for (let player of this.state.players) {
                if (player.aliases.find((alias) => {
                    return alias.toLowerCase().includes(textLower)
                }) !== undefined) {
                    this.state.searchPlayerMatches.push(player)
                    this.setState(this.state)

                    if (matchCount++ > 10) {
                        return
                    }
                }
            }
        }, 0)
    }

    onAddNewPlayer() {
        fetchEx("ADD_NEW_PLAYER", { alias: this.state.newAlias }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => {
            if (response.status >= 400) {
                throw response.message
            } else {
                return response.json()
            }
        }).then((response) => {
            if (response.success === true) {
                this.fetchPlayers()

                alert("Player Added Successfully")
            } else {
                alert(`Failed to add player!\n${response.message}`)
            }
        }).catch((error) => {
            alert(`Failed to add player!\n${error}`)
        })
    }

    addPlayerAlias(playerId, newAlias) {
        fetchEx("ADD_NEW_PLAYER_ALIAS", { playerId: playerId, alias: newAlias }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => {
            if (response.status >= 400) {
                throw response.message
            } else {
                return response.json()
            }
        }).then((response) => {
            if (response.success === true) {
                alert("Player Alias Added Successfully")
            } else {
                alert(`Failed to add player alias!\n${response.message}`)
            }
        }).catch((error) => {
            alert(`Failed to add player alias!\n${error}`)
        })
    }

    onMatchAliasChanged(event, playerNum) {
        this.state.matchId = undefined

        if (playerNum === 1) {
            this.state.matchAlias1 = event.target.value
            this.state.lastInputLocation = "matchPlayer1"
        } else {
            this.state.matchAlias2 = event.target.value
            this.state.lastInputLocation = "matchPlayer2"
        }
        this.setState(this.state)

        this.startSearch(event.target.value)
    }

    getPlayerByAlias(inAlias) {
        return this.state.players.find((player) => {
            return player.aliases.find((alias) => {
                return alias.toLowerCase() === inAlias.toLowerCase()
            }) !== undefined
        })
    }

    addNewMatch() {
        let player1 = this.getPlayerByAlias(this.state.matchAlias1)
        let player2 = this.getPlayerByAlias(this.state.matchAlias2)
        if (player1 === undefined || player2 === undefined) {
            alert(`Can't Start New Match because one of these players can't be found '${this.state.matchAlias1}' or '${this.state.matchAlias2}'`)
            return
        }

        fetchEx("ADD_RATED_MATCH", {
            player1Id: player1.playerId,
            player2Id: player2.playerId,
            time: this.state.time.getTime()
        }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                eventName: MainStore.eventName,
                braketName: MainStore.currentBracket
            })
        }).then((response) => {
            if (response.status >= 400) {
                throw response.message
            } else {
                return response.json()
            }
        }).then((response) => {
            if (response.success === true) {
                alert("Match Added Successfully")

                this.state.matchId = response.matchId
                this.state.matchPlayer1 = player1
                this.state.matchPlayer2 = player2
                this.setState(this.state)
            } else {
                alert(`Failed to add match!\n${response.message}`)
            }
        }).catch((error) => {
            alert(`Failed to add match!\n${error}`)
        })
    }

    onWinBattle(player) {
        let result = player === this.state.matchPlayer1 ? -1 : 1
        fetchEx("ADD_RATED_BATTLE", {
            matchId: this.state.matchId,
            player1Id: this.state.matchPlayer1.playerId,
            player2Id: this.state.matchPlayer2.playerId,
            result: result,
            time: this.state.time.getTime()
        }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => {
            if (response.status >= 400) {
                throw response.message
            } else {
                return response.json()
            }
        }).then((response) => {
            if (response.success === true) {
                alert("Battle Recorded Successfully")
            } else {
                alert(`Failed to record battle!\n${response.message}`)
            }
        }).catch((error) => {
            alert(`Failed to record battle!\n${error}`)
        })
    }

    getRecordBattleElement() {
        if (this.state.matchId !== undefined) {
            return (
                <div>
                    <div>
                        <button onClick={() => this.onWinBattle(this.state.matchPlayer1)}>Click for {this.state.matchPlayer1.aliases[0]} Win</button>
                    </div>
                    <div>
                        <button onClick={() => this.onWinBattle(this.state.matchPlayer2)}>Click for {this.state.matchPlayer2.aliases[0]} Win</button>
                    </div>
                </div>
            )
        } else {
            return <button onClick={() => this.addNewMatch()}>Start New Match</button>
        }
    }

    onChooseMatchPlayer(player) {
        if (this.state.lastInputLocation === "matchPlayer1") {
            this.state.matchAlias1 = player.aliases[0]
        } else {
            this.state.matchAlias2 = player.aliases[0]
        }

        this.startSearch("")

        this.setState(this.state)
    }

    getCloseMatchPlayersElement() {
        if (this.state.searchPlayerMatches.length === 0) {
            return null
        }

        let players = this.state.searchPlayerMatches.map((player) => {
            return (
                <div key={player.playerId}>
                    <button onClick={() => this.onChooseMatchPlayer(player)}>{player.aliases[0]} ({Math.round(player.rating)})</button>
                </div>
            )
        })

        return (
            <div>
                <div>
                    Players
                </div>
                {players}
                <br />
            </div>
        )
    }

    onTimeChanged(val) {
        this.state.time = val
        this.setState(this.state)
    }

    getRecordMatchElement() {
        return (
            <div>
                <div>
                    Record Matches
                </div>
                <div>
                    <label>Player 1 Alias:</label>
                    <input type="text" value={this.state.matchAlias1} onChange={(event) => this.onMatchAliasChanged(event, 1)} />
                    <label> Player 2 Alias: </label>
                    <input type="text" value={this.state.matchAlias2} onChange={(event) => this.onMatchAliasChanged(event, 2)} />
                    <MainStore.DateTimePicker onChange={(val) => this.onTimeChanged(val)} value={this.state.time} />
                </div>
                {this.getCloseMatchPlayersElement()}
                {this.getRecordBattleElement()}
            </div>
        )
    }

    getNewPlayerElement() {
        let closeMatches = this.state.searchPlayerMatches.map((player) => {
            return (
                <div key={player.playerId}>
                    {player.aliases.join(", ")}
                    <button onClick={() => this.addPlayerAlias(player.playerId, this.state.newAlias)}>Add Alias</button>
                </div>
            )
        })

        return (
            <div>
                Add Player
                <div>
                    <label>Player Name/Alias:</label>
                    <input type="text" value={this.state.newAlias} onChange={(event) => this.onNewAliasChanged(event)} />
                    <button onClick={() => this.onAddNewPlayer()}>Add New Player</button>
                    <label> or add Alias to Player: </label>
                    <input type="text" value={this.state.newPlayer} onChange={(event) => this.onNewPlayerChanged(event)} />
                </div>
                Existing Players
                {closeMatches}
            </div>
        )
    }

    calculateAllElo() {
        fetchEx("CALCULATE_ALL_ELO", undefined, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => {
            return response.json()
        }).then((response) => {
            console.log(response)
            if (response.success === true) {
                alert("Elo Updated Successfully")
            } else {
                alert(`Failed to update elo!\n${response.message}`)
            }
        }).catch((error) => {
            alert(`Failed to update elo!\n${error}`)
        })
    }

    refreshMatchHistory() {
        fetchEx("GET_MATCH_HISTORY", undefined, undefined, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => {
            return response.json()
        }).then((response) => {
            console.log(response)
            if (response.success === true) {
                console.log(response.matches, response.battles, response.players)

                this.state.matches = response.matches.sort((a, b) => {
                    return a.playedAt - b.playedAt
                })

                this.state.battles = {}
                for (let battle of response.battles) {
                    this.state.battles[battle.key] = battle
                }

                this.state.players = {}
                for (let player of response.players) {
                    this.state.players[player.key] = player
                }
                this.setState(this.state)
            }
        }).catch((error) => {
            alert(`Failed to get match history\n${error}`)
        })
    }

    deleteMatch(match) {
        if (confirm("Are you sure you want to delete match?")) {
            // delete match
        }
    }

    getPlayerName(playerId) {
        let playerData = this.state.players[playerId]
        return playerData !== undefined ? playerData.aliases[0] : "Missing Name"
    }

    getBattleHistoryElement(match) {
        let battles = match.battles.map((battleKey) => {
            let battle = this.state.battles[battleKey]

            if (battle === undefined || battle.players.length !== 2) {
                return undefined
            }

            return (
                <div key={battle.key} className="battleContainer">
                    <div className={battle.result === -1 ? "winner" : ""}>{this.getPlayerName(battle.players[0].playerId)}</div>
                    <div className="vs">{"vs"}</div>
                    <div className={battle.result === 1 ? "winner" : ""}>{this.getPlayerName(battle.players[1].playerId)}</div>
                </div>
            )
        })
        return (
            <div>
                {battles}
            </div>
        )
    }

    getMatchHistoryElement() {
        let matchElements = null
        if (this.state.matches !== undefined) {
            matchElements = this.state.matches.map((match) => {
                let playedAt = new Date(match.playedAt)
                return (
                    <div key={match.key}>
                        <div className="matchHistoryHeader">
                            {playedAt.toLocaleDateString()} {playedAt.toLocaleTimeString()} - {this.getPlayerName(match.players[0].playerId)} vs {this.getPlayerName(match.players[1].playerId)}
                            <button>Add Battle</button>
                            <button onClick={() => this.deleteMatch(match)}>Delete</button>
                        </div>
                        {this.getBattleHistoryElement(match)}
                    </div>
                )
            })
        }

        return (
            <div>
                <button onClick={() => this.refreshMatchHistory()}>Refresh Match History</button>
                {matchElements}
            </div>
        )
    }

    render() {
        return (
            <div>
                <EventInfo />
                <br />
                {this.getRecordMatchElement()}
                <br />
                <br />
                {this.getNewPlayerElement()}
                <button onClick={() => this.calculateAllElo()}>Recalculate All Elo</button>
                <br />
                <br />
                {this.getMatchHistoryElement()}
            </div>
        )
    }
}
