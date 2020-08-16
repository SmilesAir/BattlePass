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
                Tiny Room Challenge 3  {MainStore.displayName}
            </div>
        )
    }
}
