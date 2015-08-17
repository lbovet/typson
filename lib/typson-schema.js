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

var TypeScript, _, traverse; // from global scope
(function (definition) {
    // CommonJS
    if (typeof exports === "object") {
        module.exports = definition(require("underscore"), require("q"), require("traverse"), require("./typson.js"));
        // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(["vendor/underscore", "vendor/q", "vendor/traverse", "./typson"], definition);
    }
})
(function (underscore, Q, _traverse, typson) {
    if (underscore) {
        _ = underscore;
    }
    if( _traverse) {
        traverse = _traverse;
    }
    var api = {};
    var primitiveTypes = [ "string", "number", "boolean", "any" ];
    var validationKeywords = [ "type", "minimum", "exclusiveMinimum", "maximum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength", "format", "pattern", "minItems", "maxItems", "uniqueItems", "default", "additionalProperties" ];
    var annotedValidationKeywordPattern = /@[a-z.]+\s*[^@\s]+/gi;
    var TypescriptASTFlags = { "optionalName" : 4, "arrayType" : 8 };
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
                    _.each(script.moduleElements.members, function (decl) {
                        handleDeclaration(decl, definitions, refPath, "");
                    });
                });

                traverse(definitions.interfaces).forEach(function(item) {
                    if(this.key === "$ref") {
                        var currentSchema = this.path[0];
                        var lastDot = currentSchema.lastIndexOf(".");
                        if(lastDot > -1) {
                            this.update(fullModulePath(currentSchema.substring(0, lastDot), item, definitions.interfaces));
                        }
                    }
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
    };

    function handleDeclaration(decl, definitions, refPath, modulePath) {
        if (decl.nodeType() === TypeScript.NodeType.InterfaceDeclaration ||
                decl.nodeType() === TypeScript.NodeType.ClassDeclaration) {
            handleInterfaceDeclaration(decl, definitions, refPath, modulePath);
        }
        else if (decl.nodeType() === TypeScript.NodeType.ModuleDeclaration) {
            if (decl.getModuleFlags() & TypeScript.ModuleFlags.IsEnum) {
                handleEnumDeclaration(decl, definitions, modulePath);
            } else {
                _.each(decl.members.members, function (subDecl) {
                    var subModulePath = modulePath;
                    if(!(decl.getModuleFlags() & TypeScript.ModuleFlags.IsWholeFile)) {
                        subModulePath+=(decl.name.actualText+".");
                    }
                    handleDeclaration(subDecl, definitions, refPath, subModulePath);
                });
            }
        }
    }

    /**
     * Handles interface declaration as new definition and registers it in the global set of interface definitions
     *
     * @param type {object} the TypeScript AST node associated to the interface declaration
     * @param definitions {object} the set of handled interface and enum definitions
     */
    function handleInterfaceDeclaration(type, definitions, refPath, modulePath) {
        var name = (modulePath.length > 0 ? modulePath : "") + type.name.actualText;
        var definition = definitions.interfaces[name] = {};
        definition.id = name;
        definition.type = "object";
        copyComment(type, definition);
        
        definition.properties = {};
        mergeInheritedProperties(type, definition, definitions, modulePath);
        handlePropertyDeclaration(type, definition, definitions, refPath);
        _.defaults(definition, defaultProperties);
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
            var variableType = extractFullTypeName(variable.typeExpr.term);
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
                propertyType = property.items = property.items || {};
            }
            //maps
            else if (variable.typeExpr.term.getFlags() & TypescriptASTFlags.arrayType) {
                property.type = "object";

                var members = variable.typeExpr.term.members.members;

                // Map (arbitrary properties)
                if (members[0].returnTypeAnnotation) {
                    propertyType = property.additionalProperties = {};
                    variableType = variable.typeExpr.term.members.members[0].returnTypeAnnotation.term.actualText;

                    if (!variableType) {
                        // Map where value is an inline property declaration
                        _.defaults(property, defaultProperties);
                        _.defaults(property.additionalProperties, defaultProperties);
                        property.additionalProperties.type = "object";
                        property.additionalProperties.properties = {};
                        handlePropertyDeclaration(variable.typeExpr.term.members.members[0].returnTypeAnnotation.term, property.additionalProperties, definitions);
                        variableType = "any";
                    }
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

            var fullTypeName = variableType;

            //enums
            if (definitions.enums[fullTypeName]) {
                propertyType.id = definitions.enums[fullTypeName].id;
                propertyType.enum = _.keys(definitions.enums[fullTypeName].enumeration);
                addEnumDescription(definitions.enums[fullTypeName].enumeration, property);
            } 
            //other
            else if (primitiveTypes.indexOf(variableType) === -1) {
                propertyType.$ref = refPath? refPath+"/"+fullTypeName: fullTypeName;
            } else {
                if(variableType !== "any") {
                    propertyType.type = overridenType || variableType;
                }
            }
        });
    }

    function extractFullTypeName(term) {

        if(term.actualText) {
            return term.actualText;
        } else {
            if(term.nodeType() === TypeScript.NodeType.MemberAccessExpression) {
                return extractFullTypeName(term.operand1)+"."+extractFullTypeName(term.operand2);
            }
        }
    }

    /**
     * Visits every super type extended by the given type recursively and provisions the given definition with the properties of the associated super definitions.
     * 
     * @param type {object} the TypeScript AST node associated to the interface declaration 
     * @param definition {object} the definition to be provisionned
     * @param definitions {object} the set of handled interface and enum definitions
     */
    function mergeInheritedProperties(type, definition, definitions, modulePath) {
        if (type.extendsList) {
            _.each(type.extendsList.members, function (superType) {
                var modulePath_ = modulePath ? modulePath : "";
                var superDefinition;
                if (definitions.interfaces[modulePath_ + superType.actualText]) {
                    superDefinition = definitions.interfaces[modulePath_ + superType.actualText];
                } else if(superType.operand1 &&
                          superType.operand2 &&
                          definitions.interfaces[superType.operand1.actualText + "." + superType.operand2.actualText]) {
                    superDefinition = definitions.interfaces[superType.operand1.actualText + "." + superType.operand2.actualText];
                } else {
                    superDefinition = definitions.interfaces[superType.actualText];
                }
                // does the provisionning if a definition exists for the current super type
                if (superDefinition) {
                    // recursive call
                    mergeInheritedProperties(superType, definition, definitions, modulePath);
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
    function handleEnumDeclaration(type, definitions, modulePath) {
        var name = (modulePath.length > 0 ? modulePath : "") + type.name.actualText;
        var definition = definitions.enums[name] = {};
        definition.enumeration = {};
        definition.id = type.name.actualText;
        _.each(type.members.members, function (declaration) {
            var comment = declaration.declaration.declarators.members[0].docComments().slice(-1)[0];
            var commentText = comment ? comment.getDocCommentTextValue() : "";
            var declarationText = declaration.declaration.declarators.members[0].id.actualText;
            declarationText = declarationText.replace(/^["'](.+)["']$/, "$1");
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
        var delimiter = "@";
        var delimiterIndex = comment.indexOf(delimiter);
        var description = comment.slice(0, delimiterIndex < 0 ? comment.length : delimiterIndex);
        if (description.length > 0) {
            to.description = description.replace(/\s+$/g, "");
        }
        return delimiterIndex < 0 ? "" : comment.slice(delimiterIndex);
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
        var annotation;
        while ((annotation = annotedValidationKeywordPattern.exec(comment))) {
            var annotationTokens = annotation[0].split(" ");
            var keyword = annotationTokens[0].slice(1);
            var path = keyword.split(".");
            var context = null;
            if (path.length > 1) {
                context = path[0];
                keyword = path[1];
            }
            // case sensitive check inside the dictionary
            if (validationKeywords.indexOf(keyword) >= 0) {
                var value = annotationTokens.length > 1 ? annotationTokens[1] : "";
                try {
                    value = JSON.parse(value);
                } catch (e) {
                }
                if (context) {
                    if (!to[context]) {
                        to[context] = {};
                    }
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
            var table = "\n\n| "+values[0] + new Array(max+3-values[0].length).join(" ") + "| Description";
            table += "\n|-";
            _.each(enumeration, function(comment, value) {
                table += "\n| `"+value+"`"+ new Array(max+1-value.length).join(" ") + "|" + (comment ? " "+comment : "|");
            });
            property.description = property.description || "";
            property.description += table;
        }
    }

    /**
     * Compute an absolute module path to the target type given a reference module, by looking up it in
     * a type dictionary.
     *
     * @param refModule {string}
     * @param target {string}
     * @param types {object} A dictionary whose keys are the known types
     * @returns {string} the full path to the target
     */
    function fullModulePath(refModule, target, types) {
        var path = target.split("/");
        var prefix = path.splice(0, path.length-1).join("/");
        target = path.splice(-1)[0];
        var refPath = refModule.split(".");
        while(refPath.length > 0) {
            var candidate = refPath.join(".")+"."+target;
            if(candidate in types) {
                target = candidate;
                break;
            }
            refPath = refPath.slice(0, refPath.length-1);
        }
        return prefix.length > 0 ? prefix + "/" + target : target;
    }

    api.exec = function(script, type) {
        if(type) {
            api.schema(script, type).done(function(schema) {
                console.log(JSON.stringify(schema, null, 2));
            });
        } else {
            api.definitions(script).done(function(definitions) {
                console.log(JSON.stringify(definitions, null, 2));
            });
        }
    };

    if (typeof window === "undefined" && require.main === module) {
        if (process.argv[2]) {
            api.exec(process.argv[2], process.argv[3]);
        } else {
            console.log("Usage: node typson-schema.js <url-or-path-to-type-script-file> [type]\n");
        }
    } else {
        return api;
    }
});
