var ASCII_SOURCE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    ASCII_SOURCE_LENGTH = ASCII_SOURCE.length,
    EMPTY = '';

module.exports = {

    /**
    * Generates a random string of given length
    *
    * @param {Number} length
    * @returns {String}
    */
    randomString: function (length) {
        length = length || 6;

        var result = [],
            i;

        for (i = 0; i < length; i++) {
            result[i] = ASCII_SOURCE[(Math.random() * ASCII_SOURCE_LENGTH) | 0];
        }

        return result.join(EMPTY);
    }

};
