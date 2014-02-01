'use strict';

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.initConfig({
        jshint: {
            options: grunt.util._.defaults(grunt.file.readJSON('.jshintrc'), {
                reporter: 'node_modules/jshint-path-reporter'
            }),
            support: [
                'Gruntfile.js',
                'tasks/**/*.js'
            ],
            code: [
                'lib/**/*.js',
            ],
            tests: [
                'test/**/*.js'
            ]
        },
        clean: {
            tmp: ['test/tmp/**/*']
        },
        mochaTest: {
            options: {
                reporter: 'mocha-unfunk-reporter'
            },
            all: {
                src: [
                    'test/spec/*.test.js'
                ]
            }
        }
    });

    grunt.registerTask('prep', [
        'clean',
        // 'jshint:code', // should be active!
        'jshint:support',
        'jshint:tests'
    ]);
    grunt.registerTask('test', [
        'prep',
        'mochaTest'
    ]);
    grunt.registerTask('default', ['test']);
};
