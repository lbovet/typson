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

define(["typson"], function(typson) {
   var exports = {};
   var primitiveTypes = [ "string", "number", "boolean" ];

    /**
     * Creates json-schema type definitions from a type script.
     *
     * @param uri {string} Points to the source type script.
     * @returns {promise} Resolves to the schema definition structure.
     */
   exports.definitions = function(uri) {
       var d = $.Deferred();
       typson.tree(uri).done(function(tree) {
           var definitions = {};
           $.each(tree, function(k,script) {
               $.each(script.moduleElements.members, function(k, type) {
                   if(type.nodeType() == TypeScript.NodeType.InterfaceDeclaration) {
                       var definition = definitions[type.name.actualText] = {
                           id: type.name.actualText,
                           properties: {}
                       };
                       $.each(type.members.members, function(k, variable) {
                           var property = definition.properties[variable.id.actualText] = {};
                           var propertyType = variable.typeExpr.term.actualText;
                           if(primitiveTypes.indexOf(propertyType) == -1) {
                               property.$ref = propertyType;
                           } else {
                               property.type = propertyType;
                           }
                       });
                   }
               });
           });
           d.resolve(definitions);
       });
       return d.promise();
   };

   return exports;
});
