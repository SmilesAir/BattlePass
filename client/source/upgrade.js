"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const Common = require("./common.js")
const { fetchAuth } = require("./endpoints.js")

require("./upgrade.less")

module.exports.UpgradeButton = @MobxReact.observer class UpgradeButton extends React.Component {
    constructor() {
        super()
    }

    onClick() {
        MainStore.showUpgradePopup = true
    }

    render() {
        if (Common.getUserTier() > 0) {
            return null
        }

        return <button onClick={() => this.onClick()}>Upgrade To Premium Battle Pass</button>
    }
}

module.exports.UpgradePopup = @MobxReact.observer class UpgradePopup extends React.Component {
    constructor() {
        super()

        this.state = {
            code: "",
            errorText: ""
        }
    }

    redeemCode(event) {
        event.preventDefault()

        this.state.errorText = ""
        this.setState(this.state)

        MainStore.Auth.currentAuthenticatedUser().then((data) => {
            fetchAuth("REDEEM_CODE", { code: this.state.code }, undefined, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": data.signInUserSession.accessToken.jwtToken
                }
            }).then((response) => {
                return response.json()
            }).then((response) => {
                if (response.noCodeFound === true) {
                    this.state.errorText = "Invalid Code"
                    this.setState(this.state)
                } else if (response.alreadyClaimedBy !== undefined) {
                    this.state.errorText = "Code already claimed by " + response.alreadyClaimedBy
                    this.setState(this.state)
                } else {
                    MainStore.showUpgradePopup = false
                    Common.fillUserData()
                }
            }).catch((error) => {
                this.state.errorText = "Something went wrong. Error: " + error
                this.setState(this.state)
            })
        })
    }

    codeChanged(event) {
        this.state.code = event.target.value
        this.setState(this.state)
    }

    close() {
        MainStore.showUpgradePopup = false
    }

    render() {
        if (MainStore.showUpgradePopup !== true || MainStore.isLoggedIn !== true) {
            return null
        }

        return (
            <div className="upgradeContainer">
                <button>Placeholder Payment Button</button>
                <div>Redeem Code</div>
                <form onSubmit={(event) => this.redeemCode(event)}>
                    <input type="text" value={this.state.code} onChange={(event) => this.codeChanged(event)} />
                    <button>Submit</button>
                </form>
                <div>
                    {this.state.errorText}
                </div>
                <button onClick={() => this.close()}>Close</button>
            </div>
        )
    }
}
