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
   var annotationPattern = /@[a-z]+\s*[a-z0-9]+/gi;

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
                   
                   //TODO: to implement schema generation for enum declaration
                   
                   else if (type.nodeType() == TypeScript.NodeType.EnumDeclaration) {
                       var definition = definitions[type.name.actualText] = {};
                       definition.id = type.name.actualText;
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
           
           if (!copyAnnotations(commentContent, to)) {
               to.description = commentContent;
           }
       }
   }
   
   function copyAnnotations(comment, to) {
	   var hasAnnotation = false;
	   var annotation;
	   while ((annotation = annotationPattern.exec(comment))) {
		   var annotationTokens = annotation[0].split(' ');
		   var keyword = annotationTokens[0].slice(1);
		   var value = annotationTokens.length > 1 ? annotationTokens[1] : '';
		   to[keyword] = value;
		   hasAnnotation = true;
	   }
	   annotationPattern.lastIndex = 0;
	   return hasAnnotation;
   }

   return exports;
});
