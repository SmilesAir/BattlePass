"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")

require("./welcome.less")

module.exports = @MobxReact.observer class Welcome extends React.Component {
    constructor() {
        super()
    }

    close() {
        MainStore.showWelcome = false
    }

    render() {
        if (MainStore.showWelcome !== true) {
            return null
        }

        return (
            <div className="welcomeContainer">
                <h1>
                    Welcome {MainStore.displayName}!
                </h1>
                <h2>
                    You are now a premium member. Enjoy these premium benefits:
                </h2>
                <h3>
                    Raffle: You are automatically entered for a chance of winning a prize
                </h3>
                <h3>
                    Match Picking: Pick who you think will win and get rewarded with Raffle Tickets
                </h3>
                <h3>
                    Cheers: Send cheers live to the players you love
                </h3>
                <h3>
                    Prize Pool: Half of your contribution goes towards the players prize pool
                </h3>
                <button onClick={() => this.close()}>Close</button>
            </div>
        )
    }
}
