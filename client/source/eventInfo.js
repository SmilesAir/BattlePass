"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const { UpgradeButton, UpgradePopup } = require("./upgrade.js")

require("./eventInfo.less")

module.exports = @MobxReact.observer class EventInfo extends React.Component {
    constructor() {
        super()
    }

    render() {
        let ticketCount = MainStore.userData && MainStore.userData[MainStore.eventName] && MainStore.userData[MainStore.eventName].raffleTicketCount || 0
        let raffleWinPercent = (MainStore.eventRaffleTicketCount > 0 ? ticketCount / MainStore.eventRaffleTicketCount : 0) * 100
        let points = MainStore.userData && MainStore.userData[MainStore.eventName] && MainStore.userData[MainStore.eventName].points || 0
        let tier = MainStore.userData && MainStore.userData[MainStore.eventName] && MainStore.userData[MainStore.eventName].tier || 0
        let tierString = tier > 0 ? "Premium" : "Free"

        if (tier === 0) {
            return (
                <div>
                    <UpgradePopup />
                    <div>
                        {MainStore.eventName} | Username: {MainStore.displayName} ({tierString}) | <UpgradeButton />
                    </div>
                </div>
            )
        } else {
            return (
                <div>
                    {MainStore.eventName} | Username: {MainStore.displayName} ({tierString}) | Raffle Tickets: {ticketCount || 0} (Chance to win {raffleWinPercent.toFixed(0)}%) | Battle Pass Points: {points} (Level: {(points / 100).toFixed(0)})
                </div>
            )
        }
    }
}
