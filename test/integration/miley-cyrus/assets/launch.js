(function (Runner, Requester, sdk, uvm) {
    window.addEventListener('load', function () {
        var startbtn = document.getElementById("startbtn"),
            pausebtn = document.getElementById("pausebtn"),
            resumebtn = document.getElementById("resumebtn"),
            consoleArea = document.getElementById("console"),
            nIterationInput = document.getElementById("n-iterations"),

            consoleRecord = function () {
                var args = Array.prototype.slice.call(arguments),
                    string;
                args = args.map(function (member) {
                    if (typeof member === "object") {
                        return JSON.stringify(member);
                    }
                    if (member.toString()) {
                        return member.toString();
                    }
                });
                string = args.join(' ');
                consoleArea.innerHTML = consoleArea.innerHTML + (consoleArea.innerHTML ? '\n' : '') + string;
            };

        document.getElementById("btn-clear").addEventListener('click', function () {
            consoleArea.innerHTML = '';
        });

        startbtn.addEventListener('click', function () {
            var rawCollection = document.getElementById("collectionholder").value,
                collection,
                runner;
            try {
                rawCollection = JSON.parse(rawCollection);
            }
            catch (e) {
                consoleRecord('ERROR: The given collection is not valid JSON');
                return;
            }
            collection = new (sdk.Collection)(rawCollection);

                runner = new (Runner)({
                    run: {
                        requester: {
                            external: true,
                            instance: new (Requester)()
                        },
                        host: {
                            requires: ['lodash', 'crypto-all', 'tv4', 'xml2js', 'atob', 'btoa', 'sugar', 'buffer', 'backbone'],
                            requirePath: '/requires/'
                        }
                    }
                });
                runner.run(collection, {
                    environment: {
                        // 'var-1': 'get',
                        'var-2': 'cookies',
                        'var-3': 'headers'
                    },
                    iterationCount: parseInt(nIterationInput.value)
            }, function (err, run) {
                    console.log('Created a new Run!', run);
                    pausebtn.addEventListener('click', function () {
                        run.pause();
                    });
                    resumebtn.addEventListener('click', function () {
                        run.resume();
                    });


                    run.start({
                        start: function () {
                            consoleRecord('Starting run');
                        },
                        beforeIteration: function (err, n) {
                            // probably nothing
                            consoleRecord('    Before iteration:', n.iteration);
                        },
                        iteration: function (err, n) {
                            // probably nothing
                            consoleRecord('    After iteration:', n.iteration);
                        },
                        beforeItem: function (err, cursor, item) {
                            // probably nothing
                            consoleRecord('       Before Item:', item.name);
                        },
                        item: function (err, cursor, item) {
                            // probably nothing
                            consoleRecord('       After Item:', item.name);
                        },
                        beforePrerequest: function (err, cursor, events, item) {
                            // probably nothing
                            consoleRecord('           Before Prerequest:', item.name);
                        },
                        prerequest: function (err, cursor, results, item) {
                            // probably nothing
                            consoleRecord('           After Prerequest:', item.name);
                        },
                        beforeTest: function (err, cursor, events, item) {
                            // probably nothing
                            consoleRecord('           Before Test:', item.name);
                        },
                        test: function (err, cursor, results, item) {
                            consoleRecord('           After Test', item.name);
                            var result = results[0] && results[0].result,
                                tests,
                                string;

                            if (err) {
                                consoleRecord('Error!: ' + JSON.stringify(err, ["message", "arguments", "type", "name"]));
                                return;
                            }

                            tests = result && result.globals.tests;
                            for (var t in tests) {
                                if (tests.hasOwnProperty(t)) {
                                    string = '                ' + t + ' <span style="color: ' + (tests[t] ? '#00D601' : '#D62930') + '">' + tests[t] + '</span>';
                                    consoleArea.innerHTML = consoleArea.innerHTML + '\n' + string;
                                }
                            }
                        },
                        beforeRequest: function (err, cursor, request, item) {
                            // probably nothing
                            consoleRecord('           Before requesting:', item.name);
                        },
                        request: function (err, cursor, response, request, item) {
                            // probably nothing
                            consoleRecord('           After requesting:', item.name);
                        },

                        console: function (cursor, level, message) {
                            consoleRecord(arguments);
                        },

                        pause: function (err, cursor) {
                            // probably nothing
                            consoleRecord('           Paused:', [cursor.iteration, cursor.position]);
                        },
                        resume: function (err, cursor) {
                            // probably nothing
                            consoleRecord('           Resumed:', [cursor.iteration, cursor.position]);
                        },
                        done: function (err, cursor) {
                            run.host.dispose();
                            if (err) {
                                throw err;
                            }
                            consoleRecord('All Done!');
                        }
                    });
                });
        });
    });
}(this.Runner, this.Requester, this.sdk, this.uvm));
