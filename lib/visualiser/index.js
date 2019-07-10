var _ = require('lodash'),
    sdk = require('postman-collection'),
    Handlebars = require('handlebars');

module.exports = {
    /**
     * Hydrate the given template with given data and produce final HTML to render in visualiser
     *
     * @param {String} template - handlebars template as a string
     * @param {VariableScope} globals - global variables
     * @param {VariableScope} environment - environment variables
     * @param {Response} response - received response
     * @param {Object} [options] - options for processing the template
     * @param {Function} callback - callback called with errors and processed template
     */
    processTemplate: function (template, globals, environment, response, options, callback) {
        // bail out if there is no valid template to process
        if (!(template && typeof template === 'string')) {
            return callback(new Error(`Invalid template. Template must be of type string, found ${typeof template}`));
        }

        if (!callback && typeof options === 'function') {
            callback = options;
            options = {};
        }

        typeof callback !== 'function' && (callback = _.noop);

        // ensure that passed arguments are sdk objects
        (globals && !sdk.VariableScope.isVariableScope(globals)) &&
            (globals = new sdk.VariableScope(globals));

        (environment && !sdk.VariableScope.isVariableScope(environment)) &&
            (globals = new sdk.VariableScope(environment));

        (response && !sdk.Response.isResponse(response)) &&
            (response = new sdk.Response(response));

        var handlebarsOptions = options && options.handlebarsOptions,
            compiledTemplate = Handlebars.compile(template, handlebarsOptions),
            jsonResponse,
            templateData,
            processedTemplate;

        try {
            jsonResponse = response && response.json();
        }
        catch (err) {
            // ignore response if it is not a valid json response
            jsonResponse = undefined;
        }

        // merge all data according to their priority into single object
        templateData = _.merge({},
            globals && globals.toObject(),
            environment && environment.toObject(),
            jsonResponse,
            options && options.data);

        try {
            // hydrate the template with provided data
            processedTemplate = compiledTemplate(templateData);
        }
        catch (err) {
            return callback(err);
        }

        return callback(null, processedTemplate);
    }
};
