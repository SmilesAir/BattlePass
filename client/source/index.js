"use strict"

const React = require("react")
const ReactDOM = require("react-dom")
const MobxReact = require("mobx-react")
import Reacket from "reacket"
import Amplify from "@aws-amplify/core"
import { Hub } from "@aws-amplify/core"
import Auth from "@aws-amplify/auth"
import { AmplifySignOut, AmplifyAuthenticator, AmplifySignInButton, AmplifySignUp, AmplifySignIn } from "@aws-amplify/ui-react"
import DateTimePicker from "react-datetime-picker"

const MainStore = require("./mainStore.js")
const Setup = require("./setup.js")
const Admin = require("./admin.js")
const Basic = require("./basic.js")
const Runtime = require("./runtime.js")
const Overlay = require("./overlay.js")
const Leaderboard = require("./leaderboard.js")
const EloEditor = require("./eloEditor.js")
const Common = require("./common.js")

require("./index.less")

if (__STAGE__ === "DEVELOPMENT") {
    Amplify.configure({
        Auth: {
            region: "us-west-2",
            userPoolId: "us-west-2_lQ8aO1UoM",
            userPoolWebClientId: "5pu56p45tjj0dm27n4o944rprn",
            mandatorySignIn: true
        }
    })
} else {
    Amplify.configure({
        Auth: {
            region: "us-west-2",
            userPoolId: "us-west-2_IazZX4szP",
            userPoolWebClientId: "44oo1ud0b7qk101c3aaf8arbts",
            mandatorySignIn: true
        }
    })
}

MainStore.url = new URL(window.location.href)
MainStore.Reacket = Reacket
MainStore.Auth = Auth
MainStore.AmplifySignOut = AmplifySignOut
MainStore.DateTimePicker = DateTimePicker

@MobxReact.observer class AccountLogin extends React.Component {
    constructor() {
        super()

        Auth.currentAuthenticatedUser().then((data) => {
            MainStore.isLoggedIn = true
            MainStore.cognitoUsername = data.username
            MainStore.displayName = data.attributes.name

            Common.fillUserData()
        }).catch(() => {
            MainStore.isLoggedIn = false
        })

        Hub.listen("auth", (data) => {
            const { payload } = data
            this.onAuthEvent(payload)
        })
    }

    onAuthEvent(payload) {
        if (payload.event === "signIn") {
            MainStore.isLoggedIn = true
            MainStore.cognitoUsername = payload.data.username
            MainStore.displayName = payload.data.attributes.name
            MainStore.showAuthenticator = false

            Common.fillUserData()
        } else if (payload.event === "signOut") {
            MainStore.isLoggedIn = false
            MainStore.cognitoUsername = undefined
            MainStore.displayName = undefined
            MainStore.showAuthenticator = false
        }
    }

    render() {
        if (MainStore.url.searchParams.get("mode") === "overlay") {
            return null
        }

        return (
            <div>
                <div>
                    { MainStore.showAuthenticator ? <AmplifyAuthenticator>
                        <AmplifySignUp
                            slot="sign-up"
                            formFields={[
                                {
                                    type: "username",
                                    label: "Email *"
                                },
                                { type: "password" },
                                {
                                    type: "name",
                                    label: "Display Name *",
                                    placeholder: "Enter your display name",
                                    required: true
                                }
                            ]}
                        />
                        <AmplifySignIn
                            slot="sign-in"
                            formFields={[
                                {
                                    type: "username",
                                    label: "Email *"
                                },
                                { type: "password" },
                            ]}
                        />
                    </AmplifyAuthenticator> : null }
                    { !MainStore.isLoggedIn && !MainStore.showAuthenticator ? <AmplifySignInButton onClick={() => {
                        MainStore.showAuthenticator = true
                    }}>Sign Up / Sign In</AmplifySignInButton> : null }
                </div>
                <div className="signOut">
                    { MainStore.isLoggedIn ? <AmplifySignOut /> : null }
                </div>
            </div>
        )
    }
}

@MobxReact.observer class MainContent extends React.Component {
    constructor() {
        super()

        this.state = {
            view: MainStore.url.searchParams.get("mode") || "basic"
        }
    }

    getBasic() {
        return <Basic />
    }

    getSetup() {
        return (
            <div>
                <Setup />
                <Reacket matches={MainStore.reacketMatches} />
            </div>
        )
    }

    getRuntime() {
        return (
            <Runtime />
        )
    }

    render() {
        if (!Common.isAdmin() && this.state.view !== "overlay") {
            return this.getBasic()
        }

        switch (this.state.view) {
            case "basic":
                return this.getBasic()
            case "setup":
                return this.getSetup()
            case "runtime":
                return this.getRuntime()
            case "overlay":
                return <Overlay />
            case "leaderboard":
                return <Leaderboard />
            case "eloEditor":
                return <EloEditor />
            default:
                return (
                    <div>
                    Something went wrong. Contact ryan@smilesair.com
                    </div>
                )
        }
    }
}

@MobxReact.observer class Main extends React.Component {
    constructor() {
        super()
    }

    render() {
        return (
            <div>
                <Admin />
                <AccountLogin />
                <MainContent />
            </div>
        )
    }
}

ReactDOM.render(
    <Main />,
    document.getElementById("mount")
)
