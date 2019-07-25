const Handlebars = require('handlebars');

module.exports = {
    /**
     * Hydrate the given template with given data and produce final HTML to render in visualizer
     *
     * @param {String} template - handlebars template as a string
     * @param {Object} userData - data provided by user
     * @param {Object} options - options for processing the template
     * @param {Function} callback - callback called with errors and processed template
     */
    processTemplate: function (template, userData, options, callback) {
        // bail out if there is no valid template to process
        if (typeof template !== 'string') {
            return callback(new Error(`Invalid template. Template must be of type string, found ${typeof template}`));
        }

        var compiledTemplate = Handlebars.compile(template, options),
            processedTemplate;

        try {
            // hydrate the template with provided data
            processedTemplate = compiledTemplate(userData);
        }
        catch (err) {
            return callback(err);
        }

        return callback(null, processedTemplate);
    }
};
