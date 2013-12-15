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
   var validationKeywords = [ "minimum", "exclusiveMinimum", "maximum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength", "format", "pattern", "minItems", "maxItems", "uniqueItems" ];
   var annotedValidationKeywordPattern = /@[a-z]+\s*[a-z0-9]+/gi;

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
                       var definition = definitions[type.name.actualText] = {};
                       definition.id = type.name.actualText;
                       copyComment(type, definition);
                       definition.properties = {};
                       copyComment(type, definition);
                       $.each(type.members.members, function(k, variable) {
                           var property = definition.properties[variable.id.actualText] = {};
                           var variableType = variable.typeExpr.term.actualText;
                           copyComment(variable, property);
                           var propertyType = null;

                           //TODO: to implement schema generation for map declaration
                           //TODO: to implement schema generation for enum declaration                 
                           
                           if(variable.typeExpr.getFlags() & 8 /* todo: find constant */) {
                               property.type = "array";
                               propertyType = property.items = {};
                           } else {
                               propertyType = property;
                           }

                           if(primitiveTypes.indexOf(variableType) == -1) {
                               propertyType.$ref = variableType;
                           } else {
                               propertyType.type = variableType;
                           }
                       });
                   }
               });
           });
           d.resolve(definitions);
       });
       return d.promise();
   };

   function copyComment(from, to) {
       var comments = from.docComments();
       
       if(comments.length > 0) {
           var commentContent = comments.slice(-1)[0].getDocCommentTextValue();
           extractValidationKeywordsFromComment(extractDescriptionFromComment(commentContent, to), to); 
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
   function extractDescriptionFromComment(comment, to) {
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
   function extractValidationKeywordsFromComment(comment, to) {
	   annotedValidationKeywordPattern.lastIndex = 0;
	   while ((annotation = annotedValidationKeywordPattern.exec(comment))) {
		   var annotationTokens = annotation[0].split(' ');
		   var keyword = annotationTokens[0].slice(1);
		   // case sensitive check inside the dictionary
		   if (validationKeywords.indexOf(keyword) >= 0) {
			   var value = annotationTokens.length > 1 ? annotationTokens[1] : '';
			   to[keyword] = value;
		   }
	   }
   }

   return exports;
});
