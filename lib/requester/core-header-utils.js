module.exports = {
    /**
    * Find the enabled header with the given name.
    *
    * @todo Add this helper in Collection SDK.
    *
    * @private
    * @param {HeaderList} headers -
    * @param {String} name -
    * @param {Object} disabledSystemHeaders -
    * @returns {Header|undefined}
    */
    oneNormalizedHeader (headers, name, disabledSystemHeaders) {
        let i,
            header,
            systemHeaderDisabled,
            findIfKeyIsDisabled = (object, key) => {
                let disabledEntries = Object.keys(object).filter((k) => {
                    return k.toLowerCase() === key.toLowerCase() && object[k] === true;
                });

                return Boolean(disabledEntries.length);
            };

        // if the header key is present in the disabledSystemHeaders
        // with disabled flag as true
        // we will not consider system headers.
        systemHeaderDisabled = disabledSystemHeaders && findIfKeyIsDisabled(disabledSystemHeaders, name);

        // get all headers with `name`
        headers = headers.reference[name.toLowerCase()];

        if (Array.isArray(headers)) {
            // traverse the headers list in reverse direction in order to find the last enabled
            for (i = headers.length - 1; i >= 0; i--) {
                header = headers[i];

                if (header && !header.disabled && !(systemHeaderDisabled && header.system)) {
                    return header;
                }
            }

            // bail out if no enabled header was found
            return;
        }

        // return the single enabled header
        if (headers && !headers.disabled && !(systemHeaderDisabled && headers.system)) {
            return headers;
        }
    }
};
