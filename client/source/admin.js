"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const Common = require("./common.js")

require("./admin.less")

module.exports = @MobxReact.observer class Admin extends React.Component {
    constructor() {
        super()
    }

    render() {
        const urlBase = "http://192.168.0.197:8080/index.html?mode="

        if (Common.isAdmin() && MainStore.url.searchParams.get("mode") !== "overlay") {
            return (
                <div className="admin">
                    Admin Panel
                    <a className="link" href={`${urlBase}basic`}>Basic</a>
                    <a className="link" href={`${urlBase}setup`}>Setup</a>
                    <a className="link" href={`${urlBase}runtime`}>Runtime</a>
                    <a className="link" href={`${urlBase}overlay&cheers=1`}>Overlay</a>
                </div>
            )
        }

        return null
    }
}
