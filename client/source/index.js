"use strict"

const React = require("react")
const ReactDOM = require("react-dom")
const MobxReact = require("mobx-react")
const Mobx = require("mobx")
import Reacket from "reacket"
const Duel = require("duel")

require("./index.less")

let matches = Mobx.observable([])

function updateBracketFromNames(namesString) {
    let names = namesString.split("\n")
    names = names.filter((name) => {
        return name !== undefined && name.length > 0
    })

    if (names.length < 4) {
        return
    }

    let d = new Duel(names.length)

    matches.splice(0, matches.length)
    for (let match of d.matches) {
        let newMatch = {
            id: `${match.id.s}.${match.id.r}.${match.id.m}`,
            round: match.id.s === 2 ? d.p : match.id.r,
            match: match.id.m,
            players: [],
            "score": [
                0,
                0
            ]
        }

        for (let player of match.p) {
            if (player === 0) {
                newMatch.players.push({
                    "id": 0,
                    "name": "TBD",
                    "seed": 0
                })
            } else if (player !== -1) {
                newMatch.players.push({
                    "id": player,
                    "name": names[player - 1],
                    "seed": player
                })
            } else {
                newMatch.needSpacer = true
                newMatch.players.push({
                    "id": 0,
                    "name": "Spacer",
                    "seed": 0
                })
            }
        }

        matches.push(newMatch)
    }
}

@MobxReact.observer class Main extends React.Component {
    constructor() {
        super()
    }

    render() {
        return (
            <div>
                <div>
                    Tiny Room Challenge 3
                </div>
                <Reacket matches={matches} />
                <Setup />
            </div>
        )
    }
}

@MobxReact.observer class Setup extends React.Component {
    constructor() {
        super()

        this.state = {
            namesText: "",
            swapName: undefined
        }
    }

    componentDidMount() {
        this.state.namesText = "a\nb\nc\nd\ne\nf\ng\nh"
        this.setState(this.state)
        updateBracketFromNames(this.state.namesText)
    }

    onNamesChanged(event) {
        this.state.namesText = event.target.value
        this.setState(this.state)
        updateBracketFromNames(this.state.namesText)
    }

    swapPlayer(name) {
        if (this.state.swapName === undefined) {
            this.state.swapName = name
        } else {
            let s1 = this.state.namesText.indexOf(this.state.swapName)
            let s2 = this.state.namesText.indexOf(name)
            if (s1 < s2) {
                this.state.namesText = [ this.state.namesText.slice(0, s1), name, this.state.namesText.slice(s1 + this.state.swapName.length) ].join("")
                s2 = this.state.namesText.indexOf(name, s1 + name.length)
                this.state.namesText = [ this.state.namesText.slice(0, s2), this.state.swapName, this.state.namesText.slice(s2 + name.length) ].join("")
            } else {
                this.state.namesText = [ this.state.namesText.slice(0, s2), this.state.swapName, this.state.namesText.slice(s2 + name.length) ].join("")
                s1 = this.state.namesText.indexOf(this.state.swapName, s2 + this.state.swapName.length)
                this.state.namesText = [ this.state.namesText.slice(0, s1), name, this.state.namesText.slice(s1 + this.state.swapName.length) ].join("")
            }

            this.state.swapName = undefined
        }

        this.setState(this.state)
        updateBracketFromNames(this.state.namesText)
    }

    getPlayerEntries() {
        if (this.state.namesText === undefined || this.state.namesText.length === 0) {
            return null
        }

        let names = this.state.namesText.split("\n")
        let needSwapButton = names.length > 1
        let seed = 1
        return names.map((name) => {
            if (name !== undefined && name.length > 0) {
                return (
                    <div key={name}>
                        {seed++}. {name}{needSwapButton ? " - " : ""}
                        {needSwapButton ? <button onClick={() => this.swapPlayer(name)}>swap</button> : null}
                    </div>
                )
            }

            return undefined
        })
    }

    render() {
        return (
            <div>
                <div>
                    Tournament Setup
                </div>
                <div>
                    <div>Enter player names (1 per line)</div>
                    <textarea onChange={(event) => this.onNamesChanged(event)} value={this.state.namesText} />
                </div>
                <div>
                    {this.getPlayerEntries()}
                </div>
            </div>
        )
    }
}

ReactDOM.render(
    <Main />,
    document.getElementById("mount")
)
