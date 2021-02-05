"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")

require("./rewards.less")

module.exports = @MobxReact.observer class Rewards extends React.Component {
    constructor() {
        super()
    }

    close() {
        MainStore.showRewards = false
    }

    render() {
        if (MainStore.showRewards !== true || MainStore.rewards === undefined) {
            return null
        }

        let rewards = []
        for (let reward in MainStore.rewards) {
            let name = "Missing Name"
            switch (reward) {
                case "raffleTicketCount":
                    name = "Raffle Tickets"
                    continue
                    //break
                case "points":
                    name = "Battle Pass Points"
                    break
            }
            let amount = MainStore.rewards[reward]
            rewards.push(
                <h2 key={name}>
                    {amount} {name}
                </h2>
            )
        }

        return (
            <div className="rewardsContainer">
                <h1>
                    You Got
                </h1>
                {rewards}
                <button onClick={() => this.close()}>Close</button>
            </div>
        )
    }
}
