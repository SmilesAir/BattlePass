
module.exports.MatchResult = class {
    constructor(s, r, m, s1, s2, isFinal) {
        this.duelId = {
            s: s,
            r: r,
            m: m
        }
        this.id = `${s}.${r}.${m}`
        this.dynamodId = `${s}_${r}_${m}`
        this.score = [ s1 || 0, s2 || 0 ]
        this.isFinal = isFinal || false
    }
}
