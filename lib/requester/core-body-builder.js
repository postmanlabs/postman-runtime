/**
 * @fileOverview
 *
 * This module consists all request body transformer functions based on the request body modes supported
 *
 * Ideally, this should one day move to a function in SDK something like request.getNodeRequestOptions()
 */
var _ = require('lodash'),

    // the following two are reducer functions. we keep it defined here to avoid redefinition upon each parse
    urlEncodedBodyReducer,
    formDataBodyReducer;

/**
 * Reduces postman SDK url encoded form definition (flattened to array) into Node compatible body options
 *
 * @param {Object} form -
 * @param {Object} param -
 *
 * @returns {Object} form
 */
urlEncodedBodyReducer = function (form, param) {
    if (!param || param.disabled) {
        return form;
    }

    var key = param.key,
        value = param.value;

    // add the parameter to the form while accounting for duplicate values
    if (!form.hasOwnProperty(key)) {
        form[key] = value;
        return form;
    }

    // at this point, we know that form has duplicate, so we need to accumulate it in an array
    if (!Array.isArray(form[key])) {
        form[key] = [form[key]];
    }

    form[key].push(value); // finally push the duplicate and return
    return form;
};

/**
 * Reduces postman SDK multi-part form definition (flattened to array) into Node compatible body options
 *
 * @param {Object} data -
 * @param {Object} param -
 *
 * @returns {Object} data
 */
formDataBodyReducer = function (data, param) {
    if (!param || param.disabled) {
        return data;
    }

    var key = param.key,
        value = param.value,
        options; // we keep the default blank and then set to object wherever needed. saves doing object keyLength

    // if data has a truthy content type, we mutate the value to take the options. we are assuming that
    // blank string will not be considered as an accepted content type.
    if (param.contentType && _.isString(param.contentType)) {
        (options || (options = {})).contentType = param.contentType;
    }

    // additionally parse the file name and length if sent
    // @note: The filepath property overrides filename and may contain a relative path.
    if (_.isString(param.fileName)) { (options || (options = {})).filename = param.fileName; }
    if (_.isNumber(param.fileLength)) { (options || (options = {})).knownLength = param.fileLength; }

    // if options were set, we then transform the value to a special option override format that the form-data module
    // supports
    if (options) {
        value = {
            value: value,
            options: options
        };
    }

    // add the parameter to the form while accounting for duplicate values
    if (!data.hasOwnProperty(key)) {
        data[key] = value;
        return data;
    }

    // at this point, we know that form has duplicate, so we need to accumulate it in an array
    if (!Array.isArray(data[key])) {
        data[key] = [data[key]];
    }

    data[key].push(value); // finally push the duplicate and return
    return data;
};

/**
 * This module exposes functions that are named corresponding to Postman collection body modes. It accepts the body
 * definition, usually like `request.body.raw` where mode is `raw` and returns its equivalent structure that needs to be
 * sent to node request module
 */
module.exports = {
    /**
     * @param {Object} content
     * @returns {Object}
     */
    raw: function (content) {
        return {
            body: content
        };
    },

    /**
     * @param {Object} content
     * @returns {Object}
     */
    urlencoded: function (content) {
        if (_.isFunction(content.all)) { content = content.all(); } // flatten the body content

        return {
            form: _.reduce(content, urlEncodedBodyReducer, {})
        };
    },

    /**
     * @param {Object} content
     * @returns {Object}
     */
    formdata: function (content) {
        if (_.isFunction(content.all)) { content = content.all(); } // flatten the body content

        return {
            formData: _.reduce(content, formDataBodyReducer, {})
        };
    },

    /**
     * @param {Object} content
     * @returns {Object}
     */
    file: function (content) {
        return {
            body: content.content
        };
    }
};
