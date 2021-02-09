"use strict"

const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const Common = require("./common.js")

require("./bracketSelect.less")

module.exports = @MobxReact.observer class BracketSelect extends React.Component {
    constructor() {
        super()
    }

    selectClicked(bracket) {
        if (bracket === Common.getViewingBracketName()) {
            return
        }

        if (bracket !== MainStore.currentBracket) {
            MainStore.overrideBracket = bracket
        } else {
            MainStore.overrideBracket = undefined
        }

        Common.rebuildBracket()
    }

    render() {
        let bracketButtons = []
        for (let bracket in MainStore.brackets) {
            if (MainStore.brackets[bracket].isLocked === true) {
                let className = `bracketButton ${Common.getViewingBracketName() === bracket ? "selected" : ""}`
                bracketButtons.push(
                    <button key={bracket} className={className} onClick={() => this.selectClicked(bracket)}>{bracket}</button>
                )
            }
        }
        return (
            <div className="bracketSelectContainer">
                Brackets: {bracketButtons}
            </div>
        )
    }
}
