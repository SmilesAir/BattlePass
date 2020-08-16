/* eslint-disable no-alert */

const React = require("react")
const MobxReact = require("mobx-react")

const { fetchEx } = require("./endpoints.js")
const Common = require("./common.js")

module.exports = @MobxReact.observer class Setup extends React.Component {
    constructor() {
        super()

        this.state = {
            eventName: "",
            namesText: "",
            swapName: undefined
        }
    }

    componentDidMount() {
        // // Test Data
        // let result = new MatchResult(1, 1, 1, 2, 0, true)
        // MainStore.matchResults[result.id] = result
        // result = new MatchResult(1, 1, 2, 2, 0, true)
        // MainStore.matchResults[result.id] = result
        // result = new MatchResult(1, 1, 3, 2, 0, true)
        // MainStore.matchResults[result.id] = result
        // result = new MatchResult(1, 1, 4, 2, 0, true)
        // MainStore.matchResults[result.id] = result

        // result = new MatchResult(1, 2, 1, 2, 0, true)
        // MainStore.matchResults[result.id] = result
        // result = new MatchResult(1, 2, 2, 2, 0, true)
        // MainStore.matchResults[result.id] = result

        // this.state.namesText = "a\nb\nc\nd\ne\nf\ng\nh"
        // this.setState(this.state)
        // Common.updateBracketFromNamesString(this.state.namesText)

        fetchEx("SETUP_GET_EVENTS", undefined, undefined, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => {
            return response.json()
        }).then((response) => {
            if (response.success) {
                this.state.eventName = response.masterInfo.data.current
                this.state.eventNames = response.eventNames
                this.setState(this.state)

                if (this.state.eventName !== undefined) {
                    fetchEx("SETUP_GET_EVENT", { eventName: this.state.eventName }, undefined, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }).then((eventResponse) => {
                        return eventResponse.json()
                    }).then((eventResponse) => {
                        this.state.namesText = eventResponse.names.join("\n")
                        this.setState(this.state)
                        Common.updateBracketFromNames(eventResponse.names)
                    })
                }
            }
        })
    }

    onNamesChanged(event) {
        this.state.namesText = event.target.value
        this.setState(this.state)
        Common.updateBracketFromNamesString(this.state.namesText)
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
        Common.updateBracketFromNamesString(this.state.namesText)
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

    uploadEventData() {
        fetchEx("SETUP_NEW_EVENT", { eventName: this.state.eventName }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ names: this.state.namesText.split("\n") })
        }).then((response) => {
            console.log(response)
            if (response.status >= 400) {
                throw response.message
            } else {
                return response.json()
            }
        }).then((response) => {
            if (response.success === true) {
                alert("Event Uploaded Successfully")
            } else {
                alert(`Failed to upload Event!\n${response.message}`)
            }
        }).catch((error) => {
            alert(`Failed to upload Event!\n${error}`)
        })
    }

    onSelectedEventChanged(event) {
        this.state.eventName = event.target.value
        this.setState(this.state)
    }

    getEventsDropDown() {
        let options = [ <option key="Select Event">Select Event</option> ]
        if (this.state.eventNames !== undefined) {
            options = options.concat(this.state.eventNames.map((eventName) => {
                return <option key={eventName} value={eventName}>{eventName}</option>
            }))
        }

        return (
            <div>
                <select value={this.state.eventName} onChange={(event) => this.onSelectedEventChanged(event)}>
                    { options }
                </select>
            </div>
        )
    }

    setCurrentEvent() {
        fetchEx("SETUP_SET_CURRENT_EVENT", { eventName: this.state.eventName }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => {
            if (response.status >= 400) {
                throw response.message
            }

            return response.json()
        }).then((response) => {
            if (response.success === false) {
                throw response.message
            } else {
                alert(`Set ${this.state.eventName} event successful`)
            }
        }).catch((error) => {
            alert(`Failed to set ${this.state.eventName} as current event.\n${error}`)
        })
    }

    render() {
        return (
            <div>
                <h1>
                    Event Setup
                </h1>
                {this.getEventsDropDown()}
                <button onClick={() => this.uploadEventData()}>Upload Event</button>
                <button onClick={() => this.setCurrentEvent()} disabled={this.state.eventName === undefined || this.state.eventName.length === 0 || this.state.eventName === "Select Event"}>Set as Current Event</button>
                <div>
                    <div>Enter player names (1 per line)</div>
                    <textarea onChange={(event) => this.onNamesChanged(event)} value={this.state.namesText} />
                </div>
                <div>
                    {this.getPlayerEntries()}
                </div>
                <hr />
            </div>
        )
    }
}
