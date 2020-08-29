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
        return (
            <div>
                {MainStore.eventName} | Username: {MainStore.displayName} | Raffle Tickets: {MainStore.userData && MainStore.userData.raffleTicketCount || 0}
            </div>
        )
    }
}
