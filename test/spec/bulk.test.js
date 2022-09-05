/*jshint -W098*/
(function (definition) {
    // CommonJS
    if (typeof exports === 'object') {
        module.exports = definition(require('../imports'));
        // RequireJS
    } else if (typeof define === 'function' && define.amd) {
        return define(['test/imports'], definition);
    }
})(function (imports) {
    imports.init(describe, it);

    var Q = imports.Q;
    var typson = imports.typson;
    var schema = imports.schema;
    var assert = imports.assert;
    var baseDir = imports.baseDir;

    it('exports defined', function () {
        assert.ok(typson);
        assert.ok(schema);
    });

    function assertDefinitions(group, name, type, schemaType) {
        it.eventually('"' + group + '"', function () {

            return schema.definitions(baseDir + 'test/spec/' + group + '/' + name, type, schemaType).then(function (actual) {
                assert.isObject(actual, 'actual');

                // lets save the actual result for later
                return imports.writeJSON(baseDir + 'test/tmp/' + group + '/definitions.json', actual).then(function () {
                    // load the expected result
                    return imports.readJSON(baseDir + 'test/spec/' + group + '/definitions.json');
                }).then(function (expected) {
                    assert.isObject(expected, 'verify expected');
                    // test
                    assert.deepEqual(actual, expected);
                });
            });
        });
    }

    function assertSchema(group, name, type, schemaType) {
        it.eventually('"' + group + '"', function () {

            return schema.schema(baseDir + 'test/spec/' + group + '/' + name, type, undefined, schemaType).then(function (actual) {
                assert.isObject(actual, 'actual');

                // lets save the actual result for later
                return imports.writeJSON(baseDir + 'test/tmp/' + group + '/schema.json', actual).then(function () {
                    // load the expected result
                    return imports.readJSON(baseDir + 'test/spec/' + group + '/schema.json');
                }).then(function (expected) {
                    assert.isObject(expected, 'verify expected');
                    // test
                    assert.deepEqual(actual, expected);
                });
            });
        });
    }

    describe('definitions', function () {
        assertDefinitions('class-single', 'main.ts', 'MyObject');

        assertDefinitions('interface-single', 'main.ts', 'MyObject');
        assertDefinitions('interface-multi', 'main.ts', 'MyObject');

        assertDefinitions('forter-classic', 'main.ts', 'Transaction');
        assertDefinitions('forter-lean-portal', 'main.ts', 'Transaction', 'portal');
    });

    describe('schema', function () {
        assertSchema('class-single', 'main.ts', 'MyObject');

        assertSchema('interface-single', 'main.ts', 'MyObject');
        assertSchema('interface-multi', 'main.ts', 'MyObject');

        assertSchema('module-interface-single', 'main.ts', 'MyObject');
        assertSchema('module-interface-deep', 'main.ts', 'MyObject');

        assertSchema('forter-classic', 'main.ts', 'Transaction');
        assertSchema('forter-lean-portal', 'main.ts', 'Transaction', 'portal');
    });
});
