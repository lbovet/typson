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

(function (definition) {
    // CommonJS
    if (typeof exports === "object") {
        module.exports = definition(require('underscore'), require('q'), require('./typson.js'));
        // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(["lib/underscore", "lib/q", "typson"], definition);
    }
})
(function (underscore, Q, typson) {
    if (underscore) {
        _ = underscore;
    }
    var api = {};

    var primitiveTypes = [ "string", "number", "boolean", "any" ];
    var validationKeywords = [ "type", "minimum", "exclusiveMinimum", "maximum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength", "format", "pattern", "minItems", "maxItems", "uniqueItems", "default", "additionalProperties" ];
    var annotedValidationKeywordPattern = /@[a-z.]+\s*[^@\s]+/gi;
    var TypescriptASTFlags = { 'optionalName' : 4, 'arrayType' : 8 };
    var defaultProperties = { additionalProperties: false};
    /**
     * Creates json-schema type definitions from a type script.
     *
     * @param script {string} URI pointing to the source type script or the script itself.
     * @param refPath {string} A path to prepend to $ref references.
     */
    api.definitions = function (script, refPath) {
        return Q.promise(function (resolve) {
            typson.tree(script).done(function (tree) {
                TypeScript = typson.TypeScript;
                var definitions = {
                        interfaces: {},
                        enums: {}
                };
                _.each(tree, function (script) {
                    _.each(script.moduleElements.members, function (type) {
                        if (type.nodeType() == TypeScript.NodeType.InterfaceDeclaration) {
                            handleInterfaceDeclaration(type, definitions, refPath);
                        }
                        else if (type.nodeType() == TypeScript.NodeType.ModuleDeclaration) {
                            handleEnumDeclaration(type, definitions);
                        }
                    });
                });
                resolve(definitions.interfaces);
            });
        });
    };

    /**
     * Generates a schema from a type script.
     *
     * @param script {string} URI pointing to the source type script or the script itself.
     * @param type {string} The type to generate the schema from.
     * @param [id] {string} Schema id.
     */
    api.schema = function (script, type, id) {
        return Q.promise(function (resolve) {
            api.definitions(script, "#/definitions").done(function(definitions) {
               var schema = {};
               schema.$schema = "http://json-schema.org/draft-04/schema#";
               _.extend(schema, definitions[type]);
               delete definitions[type];
               if(id) {
                   schema.id = id;
               }
               resolve(schema);
               schema.definitions = definitions;
            });
        });
    }

    /**
     * Handles interface declaration as new definition and registers it in the global set of interface definitions
     *
     * @param type {object} the TypeScript AST node associated to the interface declaration
     * @param definitions {object} the set of handled interface and enum definitions
     */
    function handleInterfaceDeclaration(type, definitions, refPath) {
        var definition = definitions.interfaces[type.name.actualText] = _.clone(defaultProperties);
        definition.id = type.name.actualText;
        copyComment(type, definition);
        
        definition.properties = {};
        mergeInheritedProperties(type, definition, definitions);
        handlePropertyDeclaration(type, definition, definitions, refPath);
    }


    /**
     * Handles property or interface declarations and adds them to the interface definition. 
     * Recursive, if the property has child properties, i.e. inline object declarations, 
     * this function will recurse down to get all the definitions in the schema.
     *
     * @param type {object} the TypeScript AST node associated to the property declaration
     * @param definition {object} the property definition
     * @param definitions {object} the set of handled interface and enum definitions
     */
    function handlePropertyDeclaration(type, definition, definitions, refPath) {
        _.each(type.members.members, function (variable) {
            var property = definition.properties[variable.id.actualText] = {};
            copyComment(variable, property);
            var overridenType = property.type;
            var variableType = variable.typeExpr.term.actualText;
            var propertyType = null;

            //required
            if (!(variable.id.getFlags() & TypescriptASTFlags.optionalName)) {
                if (!definition.required) {
                    definition.required = [];
                }
                definition.required.push(variable.id.actualText);
            }
            //arrays
            if (variable.typeExpr.getFlags() & TypescriptASTFlags.arrayType) {
                property.type = "array";
                propertyType = property.items = {};
            }
            //maps
            else if (variable.typeExpr.term.getFlags() & TypescriptASTFlags.arrayType) {
                property.type = "object";

                var members = variable.typeExpr.term.members.members;

                // Map (arbitrary properties)
                if (members[0].returnTypeAnnotation) {
                    propertyType = property.additionalProperties = {};
                    variableType = variable.typeExpr.term.members.members[0].returnTypeAnnotation.term.actualText;
                }
                // Object (inline declaration)
                else {
                    _.defaults(property, defaultProperties);
                    property.properties = {};
                    handlePropertyDeclaration(variable.typeExpr.term, property, definitions);
                    variableType = "any";
                }
            } 
            //other
            else {
                propertyType = property;
            }
            //enums
            if (definitions.enums[variableType]) {
                property.enum = _.keys(definitions.enums[variableType].enumeration);
                addEnumDescription(definitions.enums[variableType].enumeration, property);
            } 
            //other
            else if (primitiveTypes.indexOf(variableType) == -1) {
                propertyType.$ref = refPath? refPath+"/"+variableType: variableType;
            } else {
                if(variableType !== "any") {
                    propertyType.type = overridenType || variableType;
                }
            }
        });
    }
    
    /**
     * Visits every super type extended by the given type recursively and provisions the given definition with the properties of the associated super definitions.
     * 
     * @param type {object} the TypeScript AST node associated to the interface declaration 
     * @param definition {object} the definition to be provisionned
     * @param definitions {object} the set of handled interface and enum definitions
     */
    function mergeInheritedProperties(type, definition, definitions) {
        if (type.extendsList) {
            _.each(type.extendsList.members, function (superType) {
                var superDefinition = definitions.interfaces[superType.actualText];
                // does the provisionning if a definition exists for the current super type
                if (superDefinition) {
                    // recursive call
                    mergeInheritedProperties(superType, definition, definitions);
                    // merges properties
                    for(var superKey in superDefinition.properties) {
                        definition.properties[superKey] = superDefinition.properties[superKey];
                    }
                    // merges required
                    if (superDefinition.required) {
                        _.each(superDefinition.required, function (requiredSuperPropertyName) {
                            if (!definition.required) {
                                definition.required = [];
                            }
                            definition.required.push(requiredSuperPropertyName);
                        });
                    }
                }
            });
        }       
    }
    
    /**
     * Handles enum declaration as new definition and registers it in the global set of enum definitions
     *
     * @param type {object} the TypeScript AST node associated to the enum declaration
     * @param definitions {object} the set of handled interface and enum definitions
     */
    function handleEnumDeclaration(type, definitions) {
        var definition = definitions.enums[type.name.actualText] = {};
        definition.enumeration = {};
        _.each(type.members.members, function (declaration) {
            var comment = declaration.declaration.declarators.members[0].docComments().slice(-1)[0];
            var commentText = comment ? comment.getDocCommentTextValue() : "";
            var declarationText = declaration.declaration.declarators.members[0].id.actualText;
            declarationText = declarationText.replace(/^["'](.+)["']$/, '$1');
            definition.enumeration[declarationText] = commentText;
        });
    }

    /**
     * Extracts the description and the validation keywords from a comment
     *
     * @param from {object} the TypeScript AST node
     * @param to {object} the destination variable or definition.
     */
    function copyComment(from, to) {
        var comments = from.docComments();
        if (comments.length > 0) {
            var commentContent = comments.slice(-1)[0].getDocCommentTextValue();
            copyValidationKeywords(copyDescription(commentContent, to), to);
        }
    }

    /**
     * Extracts the description part of a comment and register it in the description property.
     * The description is supposed to start at first position and may be delimited by @.
     *
     * @param comment {string} the full comment.
     * @param to {object} the destination variable or definition.
     * @returns {string} the full comment minus the beginning description part.
     */
    function copyDescription(comment, to) {
        var delimiter = '@';
        var delimiterIndex = comment.indexOf(delimiter);
        var description = comment.slice(0, delimiterIndex < 0 ? comment.length : delimiterIndex);
        if (description.length > 0) {
            to.description = description.replace(/\s+$/g, '');
        }
        return delimiterIndex < 0 ? '' : comment.slice(delimiterIndex);
    }

    /**
     * Extracts the schema validation keywords stored in a comment and register them as properties.
     * A validation keyword starts by a @. It has a name and a value. Several keywords may occur.
     *
     * @param comment {string} the full comment.
     * @param to {object} the destination variable.
     */
    function copyValidationKeywords(comment, to) {
        annotedValidationKeywordPattern.lastIndex = 0;
        // TODO: to improve the use of the exec method: it could make the tokenization
        while ((annotation = annotedValidationKeywordPattern.exec(comment))) {
            var annotationTokens = annotation[0].split(' ');
            var keyword = annotationTokens[0].slice(1);
            var path = keyword.split('.');
            var context = null;
            if (path.length > 1) {
                var context = path[0];
                keyword = path[1];
            }
            // case sensitive check inside the dictionary
            if (validationKeywords.indexOf(keyword) >= 0) {
                var value = annotationTokens.length > 1 ? annotationTokens[1] : '';
                try {
                    value = JSON.parse(value);
                } catch (e) {
                }
                if (context) {
                    if (!to[context]) to[context] = {};
                    to[context][keyword] = value;
                }
                else {
                    to[keyword] = value;
                }
            }
        }
    }


    function addEnumDescription(enumeration, property) {
        if(enumeration && _.values(enumeration).join("")) {
            var values = ["Value"];
            values = values.concat(_.keys(enumeration));
            var max = _.max(values, function(value) { return value.length; }).length;
            var table = "\n\n| "+values[0] + Array(max+3-values[0].length).join(" ") + "| Description";
            table += "\n|-";
            _.each(enumeration, function(comment, value) {
                table += "\n| `"+value+"`"+ Array(max+1-value.length).join(" ") + "|" + (comment ? " "+comment : "|");
            });
            property.description += table;
        }
    }


    api.exec = function(script, type) {
        var sys = require('sys');
        if(type) {
            api.schema(script, type).done(function(schema) {
                sys.print(JSON.stringify(schema, null, 2));
            });
        } else {
            api.definitions(script).done(function(definitions) {
                sys.print(JSON.stringify(definitions, null, 2));
            });
        }
    }

    if (typeof window === 'undefined' && require.main === module) {
        if (process.argv[2]) {
            api.exec(process.argv[2], process.argv[3]);
        } else {
            require('sys').print("Usage: node typson-schema.js <url-or-path-to-type-script-file> [type]\n");
        }
    } else {
        return api;
    }
});
