/*
 * Copyright 2013 Laurent Bovet <laurent.bovet@windmaster.ch>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _; // from global scope
(function (definition) {
    // CommonJS
    if (typeof exports === "object") {
        module.exports = definition(require("underscore"), require("q"));
        // RequireJS
    } else if (typeof define === "function" && define.amd) {
        return define(["vendor/underscore", "vendor/q", "vendor/superagent", "vendor/typescriptServices"], definition);
    }
})(function (underscore, Q, request, TypeScript) {
    if (underscore) {
        _ = underscore;
    }
    var api = {};
    var tsLoaded = Q.defer();
    api.ready = tsLoaded.promise;
    var requirejs;
    if (typeof window === "undefined") { // assuming node.js
        requirejs = require("requirejs");
        requirejs.config({
            baseUrl: __dirname
        });
        requirejs(["../vendor/typescriptServices"], function (ts) {
            TypeScript = ts;
            api.TypeScript = ts;
            tsLoaded.resolve();
        });
    } else {
        requirejs = require;
        api.TypeScript = TypeScript;
        tsLoaded.resolve();
    }

    /**
     * Loads a type script from a URI, compile it and returns a symbolic tree.
     * This will also load any referenced script transitively.
     *
     * @param uri {string} Where to load the script from.
     * @returns {promise} Resolve to a map {scriptPath -> AST }
     */
    api.tree = function (uri) {
        return Q.promise(function (resolve, fail) {
            api.ready.done(function () {
                var settings = new TypeScript.CompilationSettings();
                settings.codeGenTarget = 1;
                var compiler = new TypeScript.TypeScriptCompiler();
                compiler.emitOptions = new TypeScript.EmitOptions(settings);
                var context = {
                    compiler: compiler,
                    files: [],
                    syntaxError: false
                };
                // Load files into the compiler
                load(context, [uri])
                    .then(function () {
                        if (!context.syntaxError) {
                            var compiler = context.compiler;
                            // Perform type checking
                            compiler.pullTypeCheck();
                            var diagnostics = {
                                addDiagnostic: function (diagnostic) {
                                    console.warn(diagnostic.fileName() + ": " + diagnostic.message());
                                }
                            };
                            var fileNames = compiler.fileNameToDocument.getAllKeys();
                            for (var i = 0; i < fileNames.length; i++) {
                                var fileName = fileNames[i];
                                var semanticDiagnostics = compiler.getSemanticDiagnostics(fileName);
                                if (semanticDiagnostics.length > 0) {
                                    compiler.reportDiagnostics(semanticDiagnostics, diagnostics);
                                }
                            }
                            // Build result map
                            var scripts = {};
                            _.map(context.files, function (file) {
                                scripts[file] = compiler.getScript(file);
                            });
                            resolve(scripts);
                        } else {
                            fail();
                        }
                    }, function () {
                        fail();
                    });
            });
        });
    };

    function convertInlineComments(script) {
        return script.replace(/^[ \t]+([^\/\n]+)\/\/([^\n]+)$/gm, "/** $2 */ $1 ");
    }

    function loadScript(location) {
        if (location.indexOf("\n") !== -1) {
            var d = Q.defer();
            d.resolve(location);
            return d.promise;
        } else {
            return Q.promise(function (resolve, fail) {
                if (typeof window !== "undefined" || /^https?:\/\//.test(location)) {
                    if (request === undefined) {
                        request = require("superagent");
                    }
                    var req = request.get(location).query("_="+new Date().getTime());
                    if(req.buffer) {
                        req.buffer();
                    }
                    req.end(function (res) {
                        resolve(res.text);
                    });
                } else { // Assuming node.js
                    var fs = require("fs");
                    fs.readFile(location, "utf8", function (err, data) {
                        if(!err) {
                            resolve(data);
                        } else {
                            fail(err);
                        }
                    });
                }
            });
        }
    }

    /**
     * Loads the given files and dependencies recursively in the compiler.
     *
     * @param context {Object} Contains the compiler, file names and markers.
     * @param scripts {Array<string>} The paths of the files relative to the from path or scripts
     * @returns {promise} Resolved when all paths and dependencies are loaded and compiled
     */
    function load(context, scripts) {
        var compiler = context.compiler;
        // Create an array of promises
        var promises = _.map(scripts, function (locationOrScript) {
            // Each promise loads and adds a file to the compiler
            if (context.files.indexOf(locationOrScript) === -1) {
                return loadScript(locationOrScript)
                    .then(function (script) {
                        script = convertInlineComments(script);
                        // Pre-process to find referenced files
                        var snapshot = TypeScript.ScriptSnapshot.fromString(script);
                        var referencedFiles = _.map(TypeScript.getReferencedFiles(locationOrScript, snapshot), function (file) {
                            return fullPath(locationOrScript, file.path);
                        });
                        // Start loading the referenced files
                        var referencesPromise = load(context, referencedFiles)
                        .then(function(a){
                            context.files.push(locationOrScript);
                            return a;
                        });
                        // Parse the file
                        compiler.addSourceUnit(locationOrScript, snapshot, null, 0, true, referencedFiles);
                        var lineMap = new TypeScript.LineMap(snapshot.getLineStartPositions(), snapshot.getLength());
                        var diagnostics = {
                            addDiagnostic: function (diagnostic) {
                                var lineCol = { line: -1, character: -1 };
                                lineMap.fillLineAndCharacterFromPosition(diagnostic.start(), lineCol);
                                console.warn(diagnostic.fileName() + "(" + (lineCol.line + 1) + "," + (lineCol.character + 1) + "): " +
                                    diagnostic.message());
                            }
                        };
                        var syntacticDiagnostics = compiler.getSyntacticDiagnostics(locationOrScript);
                        if (syntacticDiagnostics.length > 0) {
                            compiler.reportDiagnostics(syntacticDiagnostics, diagnostics);
                            context.syntaxError = true;
                        }
                        return referencesPromise;
                    },
                    function(err) {
                        console.error(err);
                    }
                );
            } else {
                return true;
            }
        });
        return Q.all(promises);
    }

    /**
     * Given a target path relative to a full source path, compute its full path.
     * This resolves the leading ../ path elements
     *
     * @param source The reference full path
     * @param target The relative target path
     * @returns {string} The full target path
     */
    function fullPath(source, target) {
        // Remove the last path element
        var result = source;
        var lastSlash = source.lastIndexOf("/");
        if (lastSlash > -1) {
            result = result.substring(0, lastSlash);
        }
        // Resolves the ../ leading path elements
        while (/^\.\.\//.test(target)) {
            target = target.substring(3);
            lastSlash = Math.max(result.lastIndexOf("/"), 0);
            if (lastSlash !== -1) {
                result = result.substring(0, lastSlash);
            }
        }
        // Builds the target path
        if (result.length > 0) {
            return result + "/" + target;
        } else {
            return target;
        }
    }

    return api;
});

