'use strict';
var fs = require('fs');
var path = require('path');

module.exports = function (grunt) {

    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);
    grunt.loadNpmTasks('grunt-notify');

    // Load grunt tasks automatically, when needed
    require('jit-grunt')(grunt, {
        injector      : 'grunt-asset-injector',
        ngtemplates   : 'grunt-angular-templates',
        protractor    : 'grunt-protractor-runner',
        express       : 'grunt-express-server',
        ngAnnotate    : 'grunt-ng-annotate'
    });


    // Define the configuration for all the tasks
    grunt.initConfig({
        // vars
        env: {
            dev: { NODE_ENV: 'development' },
            prod: { NODE_ENV: 'production' }
        },

        notify_hooks: {
            options: {
                enabled: true,
                success: false,               // whether successful grunt executions should be notified automatically
                max_jshint_notifications: 5,  // maximum number of notifications from jshint output
                duration: 3                   // the duration of notification in seconds, for `notify-send only
            }
        },

        // put partials in angular cache
        html2js: require('./grunt-conf/html2js.js'),

        // Make sure code styles are up to par and there are no obvious mistakes
        eslint: require('./grunt-conf/eslint.js'),

        // Empties folders to start fresh
        clean: require('./grunt-conf/clean.js'),

        // Convert less to css
        less: require('./grunt-conf/less.js'),

        // Minify css
        cssmin: require('./grunt-conf/cssmin.js'),

        // Minify js
        uglify: require('./grunt-conf/uglify.js'),

        // Allow the use of non-minsafe AngularJS files. Automatically makes it
        // minsafe compatible so Uglify does not destroy the ng references
        ngAnnotate: require('./grunt-conf/ngannotate.js'),

        // Copies remaining files to places other tasks can use
        copy: require('./grunt-conf/copy.js'),

        rename: require('./grunt-conf/rename.js'),

        // wrap node modules for browser
        browserify: require('./grunt-conf/browserify.js'),

        // externalize source maps from bundle.js
        exorcise: {bundle: {files: {'dev/assets/bundle.js.map': ['dev/assets/bundle.js']}}},

        // Test settings
        karma: require('./grunt-conf/karma.js'),

        // Watch files
        watch: require('./grunt-conf/watch.js'),


        /*** SERVER *******************************************************************************/
        // Server settings
        express: require('./grunt-conf/express.js'),

        // Server tests
        mochaTest: require('./grunt-conf/mocha.js'),

        // e2e tests
        protractor: require('./grunt-conf/protractor.js'),

        // Debugging with node inspector
        'node-inspector': require('./grunt-conf/nodeinspector.js'),

        nodemon: require('./grunt-conf/nodemon.js'),

        concurrent: {
            liveEdit: {
                options: { logConcurrentOutput: true },
                tasks: [
                    'nodemon:dev',
                    'node-inspector:liveEdit'
                ]
            },
            debug: {
                options: { logConcurrentOutput: true },
                tasks: [
                    'nodemon:debug',
                    'node-inspector:custom'
                ]
            }
        }
    });


    grunt.registerTask('express-keepalive', 'Keep grunt running', function () {
        this.async();
    });

    grunt.registerTask('serve', function (target) {
        var tasks = {
            debug: [
                'env:dev',
                'concurrent:debug'
            ],
            dev: [
                'build:dev',
                'env:dev',
                'express:dev',
                'watch'
            ],
            liveEdit: [
                'build:liveEdit',
                'env:dev',
                'concurrent:liveEdit',
                'watch'
            ]
        };
        return grunt.task.run(tasks[target || 'dev']);
    });


    grunt.registerTask('test', function (target) {
        var tasks = {
            server : [ 'eslint:server', 'env:dev', 'mochaTest' ],
            client : [ 'eslint:client', 'env:dev', 'karma' ],
            e2e    : [ 'express:dev', 'protractor' ],
            dflt   : [ 'test:server', 'test:client' ]
        };
        return grunt.task.run(tasks[target || 'dflt']);
    });


    grunt.registerTask('build', function (target) {
        target = target || 'dev';
        console.log('TARGET = ' + target);
        var tasks = [];
        if (target === 'liveEdit') {
            tasks = [
                // 'eslint',
                'newer:less',
                'newer:copy:html',
                'newer:copy:dev',
                'browserify'
            ];
        }
        else {
            tasks = [
                // 'eslint',
                'clean:' + target,
                'less',
                'copy:html',
                'copy:dev',
                'browserify'
            ];
        }

        if (target !== 'dev' && target !== 'liveEdit') {
            tasks.push('ngAnnotate');
            tasks.push('exorcise');
            tasks.push('html2js');
            tasks.push('cssmin');
            tasks.push('copy:dist');
            tasks.push('config-prod');
            // tasks.push('uglify');
        }
        // tasks.push('test:client');
        // tasks.push('test:server');

        return grunt.task.run(tasks);
    });

    // Copy production config to dist
    grunt.registerTask('config-prod', function () {
        var targetDir = path.join(__dirname, 'dist');
        ensureDirectory(targetDir);
        targetDir = path.join(targetDir, 'server');
        ensureDirectory(targetDir);

        var buf = fs.readFileSync(path.join(__dirname, 'server/config-prod.json'));
        fs.writeFileSync(path.join(targetDir, 'config.json'), buf);
    });

    // just run (app must be already built)
    grunt.registerTask('start', ['env:dev', 'express:dev', 'watch']);

    grunt.registerTask('dist', ['build:dist']);
    grunt.registerTask('dev', ['build:dev']);
    grunt.registerTask('default', ['build:dev']);
    grunt.registerTask('liveEdit', ['server:liveEdit']);

    grunt.task.run('notify_hooks');
};

function ensureDirectory(dirname) {
    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname);
    }
}
