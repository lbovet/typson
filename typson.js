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

define([ "lib/jquery", "lib/typescriptServices" ], function () {
    var exports = {};

    /**
     * Loads a type script from a URI, compile it and returns a symbolic tree.
     * This will also load any referenced script transitively.
     *
     * @param uri {string} Where to load the script from.
     * @returns {promise} Resolve to a map {scriptPath -> AST }
     */
    exports.tree = function (uri) {
        var d = $.Deferred();
        var context = {
            compiler: new TypeScript.TypeScriptCompiler(),
            files: [],
            syntaxError: false
        };
        // Load files into the compiler
        load(context, [uri])
            .done(function () {
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
                    $.map(context.files, function (file) {
                        scripts[file] = compiler.getScript(file)
                    });
                    console.debug(scripts);
                    d.resolve(scripts);
                } else {
                    d.fail();
                }
            })
            .fail(function () {
                d.fail();
            });
        return d.promise();
    };

    function loadUrl(url) {
        if(url.indexOf("\n") != -1) {
            return $.Deferred().resolve(url).promise();
        } else {
            return $.get(url);
        }
    }

    /**
     * Loads the given files and dependencies recursively in the compiler.
     *
     * @param context {Object} Contains the compiler, file names and markers.
     * @param paths {Array<string>} The paths of the files relative to the from path
     * @returns {promise} Resolved when all paths and dependencies are loaded and compiled
     */
    function load(context, paths) {
        var compiler = context.compiler;
        // Create an array of promises
        var promises = $.map(paths, function (path) {
            // Each promise loads and adds a file to the compiler
            if (context.files.indexOf(path) == -1) {
                context.files.push(path);
                console.log("Loading " + path);
                return loadUrl(path)
                    .then(function (script) {
                        var d = $.Deferred();
                        // Pre-process to find referenced files
                        var snapshot = TypeScript.ScriptSnapshot.fromString(script);
                        var referencedFiles = $.map(TypeScript.getReferencedFiles(path, snapshot), function (file) {
                            return fullPath(path, file.path)
                        });
                        // Start loading the referenced files
                        var referencesPromise = load(context, referencedFiles);
                        // Parse the file
                        console.log("Adding " + path);
                        compiler.addSourceUnit(path, snapshot, null, 0, true, referencedFiles);
                        var lineMap = new TypeScript.LineMap(snapshot.getLineStartPositions(), snapshot.getLength());
                        var diagnostics = {
                            addDiagnostic: function (diagnostic) {
                                var lineCol = { line: -1, character: -1 };
                                lineMap.fillLineAndCharacterFromPosition(diagnostic.start(), lineCol);
                                console.warn(diagnostic.fileName() + "(" + (lineCol.line + 1) + "," + (lineCol.character + 1) + "): " +
                                    diagnostic.message());
                            }
                        };
                        var syntacticDiagnostics = compiler.getSyntacticDiagnostics(path);
                        if (syntacticDiagnostics.length > 0) {
                            compiler.reportDiagnostics(syntacticDiagnostics, diagnostics);
                            context.syntaxError = true;
                        }
                        return referencesPromise;
                    });
            } else {
                return $.Deferred().resolve().promise();
            }
        });
        return $.when.all(promises);
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
            result = result.substring(0, lastSlash)
        }
        // Resolves the ../ leading path elements
        while (/^\.\.\//.test(target)) {
            target = target.substring(3);
            lastSlash = Math.max(result.lastIndexOf("/"), 0);
            if (lastSlash != -1) {
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

    // Enables to apply $.when to an array of promises
    $.when.all = Function.prototype.apply.bind($.when, null);
    return exports;
});
