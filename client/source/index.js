"use strict"

const React = require("react")
const ReactDOM = require("react-dom")
const MobxReact = require("mobx-react")

require("./index.less")

@MobxReact.observer class Main extends React.Component {
    constructor() {
        super()
    }

    render() {
        return (
            <div>
                Starter Project
            </div>
        )
    }
}

ReactDOM.render(
    <Main />,
    document.getElementById("mount")
)
