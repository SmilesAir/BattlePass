"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const Common = require("./common.js")

require("./admin.less")

module.exports = @MobxReact.observer class Admin extends React.Component {
    constructor() {
        super()
    }

    render() {
        const urlBase = "http://192.168.0.197:8080/index.html?admin="

        if (Common.isAdmin()) {
            return (
                <div className="admin">
                    Admin Panel
                    <a className="link" href={`${urlBase}basic`}>Basic</a>
                    <a className="link" href={`${urlBase}setup`}>Setup</a>
                    <a className="link" href={`${urlBase}runtime`}>Runtime</a>
                </div>
            )
        }

        return null
    }
}
