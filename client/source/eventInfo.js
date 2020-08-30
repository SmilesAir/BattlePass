"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")

require("./eventInfo.less")

module.exports = @MobxReact.observer class EventInfo extends React.Component {
    constructor() {
        super()
    }

    render() {
        let ticketCount = MainStore.userData && MainStore.userData[MainStore.eventName] && MainStore.userData[MainStore.eventName].raffleTicketCount
        return (
            <div>
                {MainStore.eventName} | Username: {MainStore.displayName} | Raffle Tickets: {ticketCount || 0}
            </div>
        )
    }
}
