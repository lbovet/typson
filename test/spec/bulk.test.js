/*jshint -W098*/
(function (definition) {
    // CommonJS
    if (typeof exports === 'object') {
        module.exports = definition(require('../imports'));
        // RequireJS
    } else if (typeof define === 'function' && define.amd) {
        return define(['imports'], definition);
    }
})(function (imports) {
    imports.init(describe, it);

    var Q = imports.Q;
    var typson = imports.typson;
    var schema = imports.schema;
    var assert = imports.assert;

    it('exports defined', function () {
        assert.ok(typson);
        assert.ok(schema);
    });

    function assertDefinitions(group, name, type) {
        it.eventually('"' + group + '"', function () {
            return schema.definitions('test/spec/' + group + '/' + name, type).then(function (actual) {

                // lets save the actual result for later
                return imports.writeJSON('test/tmp/' + group + '/definitions.json', actual).then(function () {

                    // load the expected result
                    return imports.readJSON('test/spec/' + group + '/definitions.json');
                }).then(function (expected) {
                    // check & compare
                    assert.isObject(actual, 'actual');
                    assert.isObject(expected, 'expected');
                    assert.deepEqual(actual, expected);
                });
            });
        });
    }

    function assertSchema(group, name, type) {
        it.eventually('"' + group + '"', function () {
            return schema.schema('test/spec/' + group + '/' + name, type).then(function (actual) {

                // lets save the actual result for later
                return imports.writeJSON('test/tmp/' + group + '/schema.json', actual).then(function () {

                    // load the expected result
                    return imports.readJSON('test/spec/' + group + '/schema.json');
                }).then(function (expected) {
                    // check & compare
                    assert.isObject(actual, 'actual');
                    assert.isObject(expected, 'expected');
                    assert.deepEqual(actual, expected);
                });
            });
        });
    }

    describe('definitions', function () {
        // assertDefinitions('class-single', 'main.ts', 'MyObject');

        assertDefinitions('interface-single', 'main.ts', 'MyObject');
        assertDefinitions('interface-multi', 'main.ts', 'MyObject');
    });

    describe('schema', function () {
        // assertSchema('class-single', 'main.ts', 'MyObject');

        assertSchema('interface-single', 'main.ts', 'MyObject');
        assertSchema('interface-multi', 'main.ts', 'MyObject');
    });
});
