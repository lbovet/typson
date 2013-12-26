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

    var primitiveTypes = [ "string", "number", "boolean" ];
    var validationKeywords = [ "minimum", "exclusiveMinimum", "maximum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength", "format", "pattern", "minItems", "maxItems", "uniqueItems" ];
    var annotedValidationKeywordPattern = /@[a-z]+\s*[^@\s]+/gi;

    /**
     * Creates json-schema type definitions from a type script.
     *
     * @param uri {string} Points to the source type script.
     */
    api.definitions = function (uri) {
        return Q.promise(function (resolve) {
            typson.tree(uri).done(function (tree) {
                TypeScript = typson.TypeScript;
                var definitions = {
                		interfaces: {},
                		enums: {}
                };
                _.each(tree, function (script) {
                    _.each(script.moduleElements.members, function (type) {
                        if (type.nodeType() == TypeScript.NodeType.InterfaceDeclaration) {
                        	handleInterfaceDeclaration(type, definitions);
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
     * Handles interface declaration as new definition and registers it in the global set of interface definitions
     *
     * @param type {object} the TypeScript AST node associated to the interface declaration
     * @param definitions {object} the set of handled interface and enum definitions
     */
    function handleInterfaceDeclaration(type, definitions) {
        var definition = definitions.interfaces[type.name.actualText] = {};
        definition.id = type.name.actualText;
        copyComment(type, definition);
        
        definition.properties = {};
        mergeInheritedProperties(type, definition, definitions);
        
        _.each(type.members.members, function (variable) {
            var property = definition.properties[variable.id.actualText] = {};
            var variableType = variable.typeExpr.term.actualText;
            copyComment(variable, property);
            var propertyType = null;

            if (variable.typeExpr.getFlags() & 8 /* todo: find constant */) {
                property.type = "array";
                propertyType = property.items = {};
            } else {
                propertyType = property;
            }

        	if (definitions.enums[variableType]) {
        		property.enum = definitions.enums[variableType].enumeration;
        	} else if (primitiveTypes.indexOf(variableType) == -1) {
        		propertyType.$ref = variableType;
            } else {
                propertyType.type = variableType;
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
	    			_.each(Object.keys(superDefinition.properties), function (superKey) {
	    				definition.properties[superKey] = superDefinition.properties[superKey];
	    			});
	    			mergeInheritedProperties(superType, definition, definitions);
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
	    definition.enumeration = [];
	    _.each(type.members.members, function (declaration) {
	    	definition.enumeration.push(declaration.declaration.declarators.members[0].id.actualText);
	    });
	}

    /**
     * Extracts the description and the validation keywords from a comment
     *
     * @param from {object} the source AST node
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
            to.description = description;
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
            // case sensitive check inside the dictionary
            if (validationKeywords.indexOf(keyword) >= 0) {
                var value = annotationTokens.length > 1 ? annotationTokens[1] : '';
                try {
                    value = JSON.parse(value);
                } catch (e) {
                }
                to[keyword] = value;
            }
        }
    }

    api.exec = function(script) {
        api.definitions(script).done(function(definitions) {
            require('sys').print(JSON.stringify(definitions, null, 2));
        });
    }

    if (typeof window === 'undefined' && require.main === module) {
        if (process.argv[2]) {
            api.exec(process.argv[2]);
        } else {
            require('sys').print("Usage: node typson-schema.js <url-or-path-to-type-script-file>\n");
        }
    } else {
        return api;
    }
});
