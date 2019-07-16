var _ = require('lodash'),
    Handlebars = require('handlebars');

module.exports = {
    /**
     * Hydrate the given template with given data and produce final HTML to render in visualiser
     *
     * @param {String} template - handlebars template as a string
     * @param {VariableScope} globals - global variables
     * @param {VariableScope} environment - environment variables
     * @param {VariableScope} collectionVariables - collection variables
     * @param {VariableScope} locals - local variables
     * @param {Response} response - received response
     * @param {Object} userData - data provided by user
     * @param {Object} options - options for processing the template
     * @param {Function} callback - callback called with errors, processed template and processed data
     */
    processTemplate: function (
        template,
        globals,
        environment,
        collectionVariables,
        locals,
        response,
        userData,
        options,
        callback
    ) {
        // bail out if there is no valid template to process
        if (typeof template !== 'string') {
            return callback(new Error(`Invalid template. Template must be of type string, found ${typeof template}`));
        }

        var compiledTemplate = Handlebars.compile(template, options),
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
        templateData = _.merge({
            globals: globals && globals.toObject(),
            environment: environment && environment.toObject(),
            collection: collectionVariables && collectionVariables.toObject(),
            locals: locals && locals.toObject(),
            response: jsonResponse
        },
        userData);

        try {
            // hydrate the template with provided data
            processedTemplate = compiledTemplate(templateData);
        }
        catch (err) {
            return callback(err);
        }

        return callback(null, processedTemplate, templateData);
    }
};
