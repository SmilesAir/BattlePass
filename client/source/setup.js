/* eslint-disable no-alert */

const React = require("react")
const MobxReact = require("mobx-react")
const { v4 } = require("uuid")

const { fetchEx, fetchAuth } = require("./endpoints.js")
const Common = require("./common.js")
const MainStore = require("./mainStore.js")

module.exports = @MobxReact.observer class Setup extends React.Component {
    constructor() {
        super()

        this.state = {
            eventName: "",
            bracketName: "",
            namesText: "",
            swapName: undefined,
            isCreatingNewEvent: false,
            isCreatingNewBracket: false,
            code: ""
        }
    }

    initSetupData() {
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
                    this.fetchAndFillEventData(this.state.eventName)
                }
            }
        })
    }

    componentDidMount() {
        this.initSetupData()
    }

    fetchAndFillEventData(eventName) {
        return fetchEx("SETUP_GET_EVENT", { eventName: eventName }, undefined, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((eventResponse) => {
            return eventResponse.json()
        }).then((eventResponse) => {
            MainStore.currentBracket = eventResponse.currentBracket
            MainStore.brackets = eventResponse.brackets
            let currentBracket = Common.getCurrentBracket()
            MainStore.currentMatchId = currentBracket !== undefined ? Common.dynamoIdToReacketId(currentBracket.currentMatchId) : undefined
            this.state.bracketName = eventResponse.currentBracket
            this.state.brackets = eventResponse.brackets
            this.state.bracketNames = []
            for (let bracketName in eventResponse.brackets) {
                this.state.bracketNames.push(bracketName)
            }
            if (!this.isBracketInvalid()) {
                this.state.namesText = this.state.brackets[this.state.bracketName].names.join("\n")
                Common.updateBracketFromNamesString(this.state.namesText, false)
            }

            this.setState(this.state)
        })
    }

    onNamesChanged(event) {
        this.state.namesText = event.target.value
        this.setState(this.state)
        Common.updateBracketFromNamesString(this.state.namesText, true)
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
        Common.updateBracketFromNamesString(this.state.namesText, true)
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
        return fetchEx("SETUP_NEW_EVENT", { eventName: this.state.eventName }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
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

        if (!this.isEventInvalid()) {
            this.fetchAndFillEventData(event.target.value)
        }
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

    setCreatingNewEvent() {
        this.state.isCreatingNewEvent = true
        this.setState(this.state)
    }

    onCreateNewEvent() {
        this.state.isCreatingNewEvent = false
        this.uploadEventData().then(() => {
            location.reload()
        })
    }

    onNewEventNameChanged(event) {
        this.state.eventName = event.target.value
        this.setState(this.state)
    }

    getNewEventElement() {
        return (
            <div>
                <label>New Event Name:</label>
                <input type="text" value={this.state.eventName} onChange={(event) => this.onNewEventNameChanged(event)} />
                <button onClick={() => this.onCreateNewEvent()}>Create New Event</button>
            </div>
        )
    }

    onSelectedBracketChanged(event) {
        this.state.bracketName = event.target.value
        if (!this.isBracketInvalid()) {
            this.state.namesText = this.state.brackets[this.state.bracketName].names.join("\n")
            MainStore.currentBracket = this.state.bracketName
        }

        this.setState(this.state)

        Common.updateBracketFromNamesString(this.state.namesText, false)
    }

    getBracketsDropDown() {
        let options = [ <option key="Select Bracket">Select Bracket</option> ]
        if (this.state.bracketNames !== undefined) {
            options = options.concat(this.state.bracketNames.map((bracketName) => {
                return <option key={bracketName} value={bracketName}>{bracketName}</option>
            }))
        }

        return (
            <div>
                <select value={this.state.bracketName} onChange={(event) => this.onSelectedBracketChanged(event)}>
                    { options }
                </select>
            </div>
        )
    }

    onNewBracketTextChanged(event) {
        this.state.bracketName = event.target.value
        this.setState(this.state)
    }

    onCreateNewBracket() {
        this.state.isCreatingNewBracket = false
        this.setState(this.state)

        return fetchEx("SETUP_NEW_BRACKET", { eventName: this.state.eventName, bracketName: this.state.bracketName }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                names: this.state.namesText.split("\n"),
                results: MainStore.brackets[MainStore.currentBracket] !== undefined ? MainStore.brackets[MainStore.currentBracket].results : undefined
            })
        }).then((response) => {
            console.log(response)
            if (response.status >= 400) {
                throw response.message
            } else {
                return response.json()
            }
        }).then((response) => {
            if (response.success === true) {
                alert("Bracket Uploaded Successfully")
            } else {
                alert(`Failed to upload Bracket!\n${response.message}`)
            }
        }).catch((error) => {
            alert(`Failed to upload Bracket!\n${error}`)
        })
    }

    getNewBracketElement() {
        return (
            <div>
                <label>New Bracket Name:</label>
                <input type="text" value={this.state.bracketName} onChange={(event) => this.onNewBracketTextChanged(event)} />
                <button onClick={() => this.onCreateNewBracket()}>Create New Bracket</button>
            </div>
        )
    }

    setCreatingNewBracket() {
        this.state.isCreatingNewBracket = true
        this.setState(this.state)
    }

    setCurrentBracket() {
        return fetchEx("SETUP_SET_CURRENT_BRACKET", { eventName: this.state.eventName, bracketName: this.state.bracketName }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        })
    }

    isBracketInvalid() {
        return this.state.bracketName === undefined || this.state.bracketName.length === 0 || this.state.bracketName === "Select Bracket"
    }

    isEventInvalid() {
        return this.state.eventName === undefined || this.state.eventName.length === 0 || this.state.eventName === "Select Event"
    }

    createCode() {
        this.state.code = v4().replace(/-/g, "")
        this.setState(this.state)

        MainStore.Auth.currentAuthenticatedUser().then((data) => {
            fetchAuth("SETUP_CREATE_CODE", { eventName: this.state.eventName, code: this.state.code }, undefined, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": data.signInUserSession.accessToken.jwtToken
                }
            }).catch((error) => {
                console.error("Failed to create code", error)
            })
        })
    }

    setBracketLock(isLocked) {
        fetchEx("SETUP_SET_CURRENT_BRACKET_LOCKED", { eventName: this.state.eventName, bracketName: this.state.bracketName, isLocked: isLocked }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }).then(() => {
            this.initSetupData()
        })
    }

    updatePlayerRatings() {
        fetchEx("UPDATE_PLAYER_RATINGS", { eventName: MainStore.eventName }, undefined, {
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
                alert("Ratings Updated Successfully")
            } else {
                alert(`Failed to update ratings!\n${response.message}`)
            }
        }).catch((error) => {
            alert(`Failed to update ratings!\n${error}`)
        })
    }

    render() {
        let currentBracket = Common.getCurrentBracket()
        let isCurrentBracketLocked = false
        if (currentBracket !== undefined) {
            isCurrentBracketLocked = currentBracket.isLocked
        }
        return (
            <div>
                <h1>
                    Event Setup
                </h1>
                {this.state.isCreatingNewEvent ? this.getNewEventElement() : this.getEventsDropDown()}
                <button onClick={() => this.setCreatingNewEvent()}>Create New Event</button>
                <button onClick={() => this.setCurrentEvent()} disabled={this.isEventInvalid()}>Set as Current Event</button>
                <button onClick={() => this.updatePlayerRatings()} disabled={this.isEventInvalid()}>Update Player Ratings</button>
                <div>
                    <button onClick={() => this.createCode()}>Create Premium Code</button>
                    <label>Code: {this.state.code}</label>
                </div>
                {this.state.isCreatingNewBracket ? this.getNewBracketElement() : this.getBracketsDropDown()}
                <button onClick={() => this.onCreateNewBracket()} disabled={this.isBracketInvalid()}>Upload Bracket</button>
                <button onClick={() => this.setCreatingNewBracket()}>Create New Bracket</button>
                <button onClick={() => this.setCurrentBracket()} disabled={this.isBracketInvalid()}>Set as Current Bracket</button>
                <button onClick={() => this.setBracketLock(!isCurrentBracketLocked)} disabled={this.isBracketInvalid()}>{isCurrentBracketLocked ? "Unlock Bracket" : "Lock Bracket"}</button>
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
