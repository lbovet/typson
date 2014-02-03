'use strict';

module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-mocha');

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
                'lib/**/*.js'
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
        },
        mocha: {
            options: {
                bail: true,
                log: true,
                mocha: {
                    ignoreLeaks: true
                },
                reporter: 'mocha-unfunk-reporter',
                run: false
            },
            pass_amd: {
                options: {
                    urls: ['http://localhost:9009/test/pass-amd.html']
                }
            }
        },
        connect: {
            test: {
                options: {
                    port: 9009,
                    base: './'
                }
            },
            server: {
                options: {
                    keepalive: true,
                    port: 9001,
                    base: './'
                }
            }
        }
    });

    grunt.registerTask('default', ['test']);

    grunt.registerTask('prep', [
        'clean',
        'jshint:code',
        'jshint:support',
        'jshint:tests'
    ]);
    grunt.registerTask('test', [
        'prep',
        'node',
        'phantom'
    ]);
    grunt.registerTask('node', [
        'clean',
        'mochaTest:all'
    ]);
    grunt.registerTask('phantom', [
        'connect:test',
        'mocha'
    ]);
    grunt.registerTask('server', ['connect:server']);
};
