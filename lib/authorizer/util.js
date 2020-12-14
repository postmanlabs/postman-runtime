
function Headers (values) {
    this._values = values || {};
}

Headers.prototype.append = function (name, value) {
    this._values[name] = value;
};

Headers.prototype.delete = function (name) {
    delete this._values[name];
};

Headers.prototype.entries = function () {
    const result = [];

    for (let key in this._values) {
        result.push([key, this._values[key]]);
    }

    return result;
};

Headers.prototype.get = function (name) {
    return this._values[name];
};

Headers.prototype.has = function (name) {
    return name in this._values;
};

Headers.prototype.keys = function () {
    const result = [];

    for (let key in this._values) {
        result.push(key);
    }

    return result;
};

Headers.prototype.set = function (name, value) {
    this._values[name] = value;
};

// eslint-disable-next-line no-unused-vars
Headers.prototype.values = function (name, value) {
    const result = [];

    // eslint-disable-next-line guard-for-in
    for (let key in this._values) {
        result.push(this._values[key]);
    }

    return result;
};
