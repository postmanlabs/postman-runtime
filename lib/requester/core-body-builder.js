/**
 * @fileOverview
 *
 * This module consists all request body transformer functions based on the request body modes supported
 * Ideally, this should one day move to a function in SDK something like request.getNodeRequestOptions()
 *
 *
 *      _
 *      (  )         ,,,,,
 *          \\         . .  ,
 *          \\       | -   D ,
 *          (._)     \__-  | ,
 *                      |   |..
 *          \\|_  , ,---- _ |----.
 *          \__ ( (           /  )       _
 *              | \/ \.   '  _.|  \     (  )
 *              |  \ /(   /    /\_ \    //
 *              \ /  (       / /  )   //
 *                  (  ,   / / ,   (_.)
 *                  |......\ |  \,
 *                  /  /     ) \---
 *                /___/___^//
 */
var _ = require('lodash'),

    CONTENT_TYPE_HEADER_KEY = 'Content-Type',

    /**
     * Map content-type to respective body language.
     *
     * @private
     * @type {Object}
     */
    CONTENT_TYPE_LANGUAGE = {
        html: 'text/html',
        text: 'text/plain',
        json: 'application/json',
        javascript: 'application/javascript',
        xml: 'application/xml'
    },

    STRING = 'string',
    E = '',

    oneNormalizedHeader,

    // the following two are reducer functions. we keep it defined here to avoid redefinition upon each parse
    urlEncodedBodyReducer,
    formDataBodyReducer;

/**
 * Find the enabled header with the given name.
 *
 * @todo Add this helper in Collection SDK.
 *
 * @private
 * @param {HeaderList} headers -
 * @param {String} name -
 * @returns {Header|undefined}
 */
oneNormalizedHeader = function oneNormalizedHeader (headers, name) {
    var i,
        header;

    // get all headers with `name`
    headers = headers.reference[name.toLowerCase()];

    if (Array.isArray(headers)) {
        // traverse the headers list in reverse direction in order to find the last enabled
        for (i = headers.length - 1; i >= 0; i--) {
            header = headers[i];

            if (header && !header.disabled) {
                return header;
            }
        }

        // bail out if no enabled header was found
        return;
    }

    // return the single enabled header
    if (headers && !headers.disabled) {
        return headers;
    }
};

/**
 * Reduces postman SDK url encoded form definition (flattened to array) into Node compatible body options
 *
 * @param {Object} form - url encoded form params accumulator
 * @param {Object} param - url encoded form param
 *
 * @returns {Object}
 */
urlEncodedBodyReducer = function (form, param) {
    if (!param || param.disabled) {
        return form;
    }

    var key = param.key,
        value = param.value;

    // add the parameter to the form while accounting for duplicate values
    if (!Object.hasOwnProperty.call(form, key)) {
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
 * @param {Array} data - multi-part form params accumulator
 * @param {Object} param - multi-part form param
 *
 * @returns {Array}
 */
formDataBodyReducer = function (data, param) {
    if (!param || param.disabled) {
        return data;
    }

    var formParam = {
            key: param.key,
            value: param.value
        },
        options; // we keep the default blank and then set to object wherever needed. saves doing object keyLength

    // make sure that value is either string or read stream otherwise it'll cause error in postman-request
    if (param.type !== 'file' && typeof formParam.value !== STRING) {
        try {
            formParam.value = JSON.stringify(formParam.value);
        }
        catch (err) {
            formParam.value = E;
        }
    }

    // make sure `filename` param is sent for every file without `value`
    // so that `filename=""` is added to content-disposition header in form data
    if (param.type === 'file' && !formParam.value && typeof param.fileName !== 'string') {
        param.fileName = E;
        formParam.value = E; // make sure value is not null/undefined ever
    }

    // if data has a truthy content type, we mutate the value to take the options. we are assuming that
    // blank string will not be considered as an accepted content type.
    if (param.contentType && typeof param.contentType === STRING) {
        (options || (options = {})).contentType = param.contentType;
    }

    // additionally parse the file name and length if sent
    // @note: Add support for fileName & fileLength option in Schema & SDK.
    //        The filepath property overrides filename and may contain a relative path.
    if (typeof param.fileName === STRING) { (options || (options = {})).filename = param.fileName; }
    if (typeof param.fileLength === 'number') { (options || (options = {})).knownLength = param.fileLength; }


    // if options were set, add them to formParam
    options && (formParam.options = options);

    data.push(formParam);

    return data;
};

/**
 * This module exposes functions that are named corresponding to Postman collection body modes. It accepts the body
 * definition, usually like `request.body.raw` where mode is `raw` and returns its equivalent structure that needs to be
 * sent to node request module
 */
module.exports = {
    /**
     * @param {Object} content - request body content
     * @param {Request} [request] - request object
     * @returns {Object}
     */
    raw (content, request) {
        var contentLanguage = _.get(request, 'body.options.raw.language', 'text');

        // Add `Content-Type` header from body options if not set already
        if (request && !oneNormalizedHeader(request.headers, CONTENT_TYPE_HEADER_KEY)) {
            request.headers.add({
                key: CONTENT_TYPE_HEADER_KEY,
                value: CONTENT_TYPE_LANGUAGE[contentLanguage] || CONTENT_TYPE_LANGUAGE.text,
                system: true
            });
        }

        if (typeof content !== STRING) {
            content = JSON.stringify(content);
        }

        return {
            body: content
        };
    },

    /**
     * @param {Object} content - request body content
     * @returns {Object}
     */
    urlencoded (content) {
        if (content && _.isFunction(content.all)) { content = content.all(); } // flatten the body content

        return {
            form: _.reduce(content, urlEncodedBodyReducer, {})
        };
    },

    /**
     * @param {Object} content - request body content
     * @returns {Object}
     */
    formdata (content) {
        if (content && _.isFunction(content.all)) { content = content.all(); } // flatten the body content

        return {
            formData: _.reduce(content, formDataBodyReducer, [])
        };
    },

    /**
     * @param {Object} content - request body content
     * @returns {Object}
     */
    file (content) {
        return {
            body: content && content.content
        };
    },

    /**
     * @param {Object} content - request body content
     * @param {Request} [request] - Request object
     * @returns {Object}
     */
    graphql (content, request) {
        var body;

        // implicitly add `Content-Type` header if not set already
        if (request && !oneNormalizedHeader(request.headers, CONTENT_TYPE_HEADER_KEY)) {
            request.headers.add({
                key: CONTENT_TYPE_HEADER_KEY,
                value: CONTENT_TYPE_LANGUAGE.json,
                system: true
            });
        }

        // if `variables` is an object, just stringify the entire content
        if (content && typeof content.variables !== STRING) {
            // if any property of graphql is undefined, it will not get stringified
            // as a result, if no content object's properties are present then the
            // result will be a blank object being sent.
            // note that this behavior has to be imitated later when we are
            // receiving variables as string
            return {
                body: JSON.stringify({
                    query: content.query,
                    operationName: content.operationName,
                    variables: content.variables
                })
            };
        }

        // otherwise, traverse the graphql properties and generate the
        // stringified content. This avoids parsing the variables.
        body = [];

        if (Object.hasOwnProperty.call(content, 'query') && (typeof content.query === STRING)) {
            body.push('"query":' + JSON.stringify(content.query));
        }

        if (Object.hasOwnProperty.call(content, 'operationName') && (typeof content.operationName === STRING)) {
            body.push('"operationName":' + JSON.stringify(content.operationName));
        }

        if (Object.hasOwnProperty.call(content, 'variables') && (typeof content.variables === STRING) &&
            // even though users are free to send even malformed json string, the case of empty string has to be
            // specially disallowed since in most default cases if a text editor is used to accept this data, it will
            // send a blank string for an empty text-editor state and that would be an error flow. That implies majority
            // default use case will become error flow and handling for the same has to be also coded in every other
            // place where runtime is used.
            (content.variables !== E)) {
            body.push('"variables":' + content.variables); // already a stringified JSON
        }

        return {
            body: '{' + body.join(',') + '}' // note that [] body = {}  ¯\_(ツ)_/¯
        };
    }
};
