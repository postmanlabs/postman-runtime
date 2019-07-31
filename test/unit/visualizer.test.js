var expect = require('chai').expect,
    Visualizer = require('../../lib/visualizer');

describe('Visualizer', function () {
    describe('processTemplate', function () {
        it('should give error for invalid template', function (done) {
            var template = {};

            Visualizer.processTemplate(template, null, null, function (err) {
                expect(err).to.be.ok;
                expect(err.message).to.eql('Invalid template. Template must be of type string, found object');
                done();
            });
        });

        it('should process template without data and options', function (done) {
            var template = '<h1>Hello</h1>';

            Visualizer.processTemplate(template, null, null, function (err, processedTemplate) {
                expect(err).to.not.be.ok;

                // processed template should be equal to original template since the data is not provided
                expect(processedTemplate).to.eql(template);
                done();
            });
        });

        it('should hydrate template with given data', function (done) {
            var template = '<h1>{{name}}</h1>',
                data = {name: 'Postman'},
                hydratedTemplate = '<h1>Postman</h1>';

            Visualizer.processTemplate(template, data, null, function (err, processedTemplate) {
                expect(err).to.not.be.ok;
                expect(processedTemplate).to.eql(hydratedTemplate);
                done();
            });
        });

        it('should bubble up handlebars errors', function (done) {
            var template = '<h1>{{name</h1>',
                data = {name: 'Postman'};

            Visualizer.processTemplate(template, data, null, function (err) {
                // handlebars will throw error because given template contains invalid syntax
                expect(err).to.be.ok;
                expect(err.message).to.include('Parse error');
                done();
            });
        });

        it('should use given options to compile handlebars template', function (done) {
            var template = '<h1>{{full_name}}</h1>',
                data = {name: 'Postman'},
                options = {
                    // this will cause handlebars to throw error for missing variables
                    // in given data instead of ignoring it
                    strict: true
                };

            Visualizer.processTemplate(template, data, options, function (err) {
                expect(err).to.be.ok;
                expect(err.message).to.include('"full_name" not defined');
                done();
            });
        });
    });
});
