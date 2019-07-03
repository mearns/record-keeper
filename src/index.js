class LazyValue {
    constructor(supplier) {
        this._supplier = supplier;
    }
    get() {
        return this._supplier();
    }
}
class RecordKeeperInterface {
    recordValue(name, value, verbosity) {}
    recordValues(dict, verbosity) {}
    recordLazy(name, supplier, verbosity) {
        this.recordValue(name, new LazyValue(supplier), verbosity);
    }
}

class VerbosityLevelHandler extends RecordKeeperInterface {
    constructor(recordKeeper, verbosity) {
        super();
        this._recordKeeper = recordKeeper;
        this._verbosity = verbosity;
    }

    recordValue(name, value) {
        return this._recordKeeper.recordValue(name, value, this._verbosity);
    }
    recordValues(dict) {
        return this._recordKeeper.recordValues(dict, this._verbosity);
    }
    recordLazy(name, supplier) {
        return this._recordKeeper.recordLazy(name, supplier, this._verbosity);
    }
}

class RecordKeeper extends RecordKeeperInterface {
    constructor() {
        super();
        this._records = {};
    }

    at(verbosity) {
        return new VerbosityLevelHandler(this, verbosity);
    }

    recordValue(name, value, verbosity) {
        const recordsForVerbosity = (this._records[verbosity] =
            this._records[verbosity] || {});
        recordsForVerbosity[name] = value;
    }

    recordValues(dict, verbosity) {
        const recordsForVerbosity = (this._records[verbosity] =
            this._records[verbosity] || {});
        Object.assign(recordsForVerbosity, dict);
    }

    getRecords(maximumVerbosity) {
        const levels = Object.keys(this._records)
            .map(lvl => parseInt(lvl, 10))
            .filter(lvl => lvl <= maximumVerbosity)
            .sort();
        const records = levels.reduce(
            (acc, lvl) =>
                Object.entries(this._records[lvl]).reduce(
                    (acc2, [name, value]) => {
                        acc2[name] = [value, lvl];
                        return acc2;
                    },
                    acc
                ),
            {}
        );
        for (const key in records) {
            const [value, lvl] = records[key];
            if (value instanceof LazyValue) {
                records[key] = this._records[lvl][key] = value.get();
            } else {
                records[key] = value;
            }
        }
        return records;
    }
}

class BaseNamedRecordKeeper extends RecordKeeper {
    at(verbosity) {
        return super.at(this._getVerbosity(verbosity));
    }

    recordValue(name, value, verbosity) {
        super.recordValue(name, value, this._getVerbosity(verbosity));
    }

    recordValues(dict, verbosity) {
        super.recordValues(dict, this._getVerbosity(verbosity));
    }

    recordLazy(name, value, verbosity) {
        super.recordLazy(name, value, this._getVerbosity(verbosity));
    }

    getRecords(maximumVerbosity) {
        return super.getRecords(this._getVerbosity(maximumVerbosity));
    }
}

RecordKeeper.define = levels => {
    class NamedRecordKeeper extends BaseNamedRecordKeeper {
        constructor(defaultVerbosity) {
            super();
            this._defaultVerbosity = this._getVerbosity(defaultVerbosity);
            this.at = v => super.at(v);
            this.getRecords = v => super.getRecords(v);
            for (const levelName in levels) {
                Object.defineProperty(this.at, levelName, {
                    get: () => this.at(levels[levelName])
                });
                this.getRecords[levelName] = () =>
                    this.getRecords(levels[levelName]);
            }
        }

        _getVerbosity(verbosity = this._defaultVerbosity) {
            if (typeof verbosity === "number") {
                return verbosity;
            } else if (verbosity == null) {
                return this._defaultVerbosity;
            }
            const value = levels[verbosity];
            if (typeof value !== "number") {
                throw new Error(
                    `No such verbosity level defined: ${verbosity}`
                );
            }
            return value;
        }
    }
    return NamedRecordKeeper;
};

module.exports = RecordKeeper;
