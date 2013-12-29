Typson
======

Write your type definitions in TypeScript and Typson will generate json-schemas.

[See it in action](http://lbovet.github.io/typson-demo/) with its buddy [docson](https://github.com/lbovet/docson)

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
<script src="lib/require.js"/>
<script>
    require(["typson-schema"], function(typson) {
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

Then, adapt Swagger UI's `index.html` to

1. Include Typson integration `<script src="typson-swagger.js"></script>` _after_ the main inline script.
2. Initialize Swagger UI only once Typson is ready:
```
    var typsonReady = $.Deferred();
    typsonReady.done(function () {
```
instead of jQuery's `$(function() {` initializer.

Then, just replace the `models` section of your API file with a `tsModels` property containing the URL pointing to the type script defining the models.


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/lbovet/typson/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

