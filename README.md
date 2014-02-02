Typson
======

Write your type definitions in TypeScript and Typson will generate json-schemas.

[See it in action](http://lbovet.github.io/typson-demo/) with its buddy [docson](https://github.com/lbovet/docson)

[![Build Status](https://travis-ci.org/lbovet/typson.png?branch=master)](https://travis-ci.org/lbovet/typson)

## Features

* Available as Node.js module
* Can also run as-is in the browser.
* Integrates with Swagger.
* Supports types in multiple files.
* Translates required properties, extends, enums, maps, annotation keywords.

## Usage

### Node.js

* Install with `npm install typson -g`
* Generate definitions from a type script: `typson example/invoice/line.ts`
* Generate a schema from a type declared in a type script: `typson example/invoice/line.ts Invoice`

### Browser

```
<script src="vendor/require.js"/>
<script>
    require(["lib/typson-schema"], function(typson) {
            typson.schema("example/invoice/line.ts", "Invoice").done(function(schema) {
                console.log(schema);
            });
        });
</script>
```

### Swagger

#### Static
Generated definitions are compatible with Swagger, you can copy Typson's output to your API files.

#### Dynamic
You can make [Swagger UI](https://github.com/wordnik/swagger-ui) read type definitions directly by integrating Typson, you will need a modified version of [swagger.js](https://github.com/lbovet/swagger-js/tree/model-loader).
This version just adds the capability to load the models from another source.

See how it looks like in the [Swagger Typson example](http://lbovet.github.io/swagger-ui/dist/index.html) (Note: this example also illustrate [Docson](https://github.com/lbovet/docson) integration in Swagger).

Then, adapt Swagger UI's `index.html` to

1. Include Typson integration [_after_ the main inline script](https://github.com/lbovet/swagger-ui/blob/716515235a43c37b7d6a0f749570eb17580d3f1a/dist/index.html#L63-L69):
   ```
      <script src="/typson/vendor/require.js"></script>
      <script>
          requirejs.config({
              baseUrl: "/typson"
          });
          requirejs(["lib/typson-swagger"]);
      </script>
   ```
2. Initialize Swagger UI [only once Typson is ready](https://github.com/lbovet/swagger-ui/blob/716515235a43c37b7d6a0f749570eb17580d3f1a/dist/index.html#L30-L31):
  ```
      var typsonReady = $.Deferred();
      typsonReady.done(function () {
  ```
  instead of jQuery's `$(function() {` initializer.

Then, just replace the `models` section of your API file with a `tsModels` property [containing the URL pointing to the type script defining the models](https://github.com/lbovet/swagger-ui/blob/716515235a43c37b7d6a0f749570eb17580d3f1a/dist/api/test#L65).

## Similar Projects

* https://github.com/ysangkok/typescript-interface-to-jsonschema
* http://blog2.vorburger.ch/2013/11/devoxx-hackathon-2-typescript-ide-w.html

[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/lbovet/typson/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

