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

var requirejs, $, SwaggerApi; // from global scope
(function() {
    var oldRequire = window.require;
    window.require = requirejs;
    require(["lib/typson-schema"], function(typson) {
        SwaggerApi.modelLoader = function(api, done) {
            if(api.tsModels) {
                window.require = requirejs;
                typson.definitions(api.tsModels).done(function(definitions) {
                    api.models = api.models || {};
                    $.extend(api.models, definitions);
                    window.require = oldRequire;
                    done();
                });
            } else {
                window.require = oldRequire;
                done();
            }
        };
        $(function() {
            window.require = oldRequire;
            window.typsonReady.resolve();
        });
    });
})();
