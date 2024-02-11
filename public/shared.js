const COLORS = ['red', 'blue', 'orange', 'black'];

class Tile {
    constructor(num, color, idx) {
        this.num = num;
        this.color = color;
        this.sortValColor = num + COLORS.indexOf(color) * 100 + idx / 1000;
        this.sortValNum = num * 10 + COLORS.indexOf(color) + idx / 1000;
    }
}

class Hand {
    constructor() {
        this.groups = [];
        this.tiles = [];
    }

    push(tile) {
        this.tiles.push(tile);
    }

    getSet(tiles) {
        let set = [];
        let done = [];
        let colors = [];
        for (const t of tiles) {
            if (colors.includes(t.color)) {
                done.push(t);
            }
            else {
                colors.push(t.color);
                set.push(t);
            }
        }
        if (colors.length > 2) {
            return [set, done];
        }
        else {
            return [[], tiles];
        }
    }
    
    getRun(tiles) {
        let run = [];
        let done = [];
        for (const t of tiles) {
            if (run.length == 0) {
                run.push(t);
                continue;
            }
            if (run[run.length - 1].num == t.num) {
                done.push(t);
                continue;
            }
            if (run[run.length - 1].num + 1 == t.num) {
                run.push(t);
                continue;
            }
            if (run.length >= 3) {
                done.push(t);
                continue;
            }
            done = done.concat(run);
            run = [t];
        }
        if (run.length >= 3) {
            done.sort((a, b) => a.sortValColor - b.sortValColor);
            return [run, done];
        }
        return [[], tiles];
    }

    sortByNum() {
        for (const g of this.groups) {
            this.tiles = this.tiles.concat(g);
        }
        this.tiles.sort((a, b) => a.sortValNum - b.sortValNum);
        this.groups = [];
        let processed = [];
        for (let i = 1; i <= 13; i++) {
            let processing = [];
            while (this.tiles.length > 0 && this.tiles[0].num == i) {
                processing.push(this.tiles.shift());
            }
            while (true) {
                let set;
                [set, processing] = this.getSet(processing);
                if (set.length == 0) {
                    break;
                }
                else {
                    this.groups.push(set);
                }
            }
            processed = processed.concat(processing);
        }
        this.tiles = processed.concat(this.tiles);
    }

    sortByColor() {
        for (const g of this.groups) {
            this.tiles = this.tiles.concat(g);
        }
        this.tiles.sort((a, b) => a.sortValColor - b.sortValColor);
        this.groups = [];
        let processed = [];
        for (let c of COLORS) {
            let processing = [];
            while (this.tiles.length > 0 && this.tiles[0].color == c) {
                processing.push(this.tiles.shift());
            }
            while (true) {
                let run;
                [run, processing] = this.getRun(processing);
                if (run.length == 0) {
                    break;
                }
                else {
                    this.groups.push(run);
                }
            }
            processed = processed.concat(processing);
        }
        this.tiles = processed.concat(this.tiles);
    }
}

if (typeof module !== "undefined" && module.exports) {
    // CommonJS
    module.exports = { COLORS, Hand, Tile };
}