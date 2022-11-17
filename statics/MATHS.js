'use strict';

class MATHS {
    constructor() {};
    
    static addVectors(a, b) {
        return a.map((e, i) => e + b[i]);
    }

    static sumVectors(v) {
        let v0 = v[0];
        for (let i = 1; i < v.length; i++) {
            v0 = this.addVectors(v0, v[i]);
        }
        return v0;
    }

    static averageVectors(v) {
        const l = v.length;
        if (l == 0) return null;
        if (l == 1) return v;
        let r = this.sumVectors(v);
        r = r.map((x) => x / l);
        return r;
    }

    static euclideanDistance(a, b) {
        return a
            .map((x, i) => Math.abs( x - b[i] ) ** 2) // square the difference
            .reduce((sum, now) => sum + now) ** // sum
            (1/2);
    }

    static minDistance(vecsA, vecsB) {
        let min_d = null;
        for (var a = 0; a < vecsA.length; a++) {
            for (var b = 0; b < vecsB.length; b++) {
                const d = this.euclideanDistance(vecsA[a], vecsB[b]);
                if (min_d == null || d < min_d) {
                    min_d = d;
                }
            }
        }
        return min_d;
    }

}

module.exports.MATHS = MATHS;
