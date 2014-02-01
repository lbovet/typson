(function (definition) {
    // CommonJS
    if (typeof exports === 'object') {
        module.exports = definition(
            require('underscore'),
            require('q'),
            require('chai'),
            require('superagent'),
            require('../lib/typson'),
            require('../lib/typson-schema'));
        // RequireJS
    } else if (typeof define === 'function' && define.amd) {
        return define([
            '../vendor/underscore',
            '../vendor/q',
            '../vendor/chai',
            require('superagent'),
            '../lib/typson',
            '../lib/typson-schema'
        ], definition);
    }
})(function (underscore, Q, chai, request, typson, schema) {
    var fs;
    var mkdirp;
    var path;
    var isNode = (typeof process === 'object' && typeof process.execPath !== 'undefined');
    if (isNode) {
        fs = require('fs');
        mkdirp = require('mkdirp');
        path = require('path');
    }

    chai.Assertion.includeStack = true;

    // For some odd readom every test file needs to call this
    function init(describe, it) {
        if (it && !it.eventually) {
            // For safety
            var promiseDoneMistake = function() {
                throw new Error('don\'t use a done() callback when using it.eventually()');
            };
            // Monkey promise support
            it.eventually = function eventually(expectation, assertion) {
                it(expectation, function (done) {
                    /*jshint -W064*/
                    Q(assertion(promiseDoneMistake)).done(function () {
                        done();
                    }, function (err) {
                        done(err);
                    });
                });
            };
        }
    }

    // IO helpers
    function readFile(target) {
        if (isNode) {
            // Node
            return Q.nfcall(fs.readFile, target, 'utf8').fail(function() {
                // sileny fail for Node (for easy update of new tests)
                return null;
            });
        }
        return Q.nfcall(request, target);
    }

    function readJSON(target) {
        return readFile(target).then(function(str) {
            if (!str) {
                return null;
            }
            return JSON.parse(str);
        });
    }

    function writeFile(target, content) {
        if (isNode) {
            return Q.nfcall(mkdirp, path.dirname(target), '0.744').then(function() {
                return Q.nfcall(fs.writeFile, target, content, 'utf8');
            });
        }
        // ignore
        return Q.resolve();
    }

    function writeJSON(target, object) {
        return this.writeFile(target, JSON.stringify(object, null, '    '));
    }

    // Export bundle for easy access in tests
    return {
        isNode: isNode,
        init: init,
        underscore: underscore,
        request: request,
        typson: typson,
        schema: schema,
        chai: chai,
        assert: chai.assert,
        readFile: readFile,
        readJSON: readJSON,
        writeFile: writeFile,
        writeJSON: writeJSON,
        Q: Q
    };
});
