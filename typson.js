
function types(path) {
    var d = $.Deferred();

    $.ajax({ url: path}).done(function(script) {

        var outfile = {
            Write: function (s) {
                console.log(s);
            },
            WriteLine: function (s) {
                console.log(s);
            },
            Close: function () {
            }
        };

        var outerr = {
            Write: function (s) {
                console.warn(s);
            },
            WriteLine: function (s) {
                console.warn(s);
            },
            Close: function () {
            }
        };
        var compiler = new TypeScript.TypeScriptCompiler(outfile, outerr);
        console.log(compiler.addUnit(script, path, false));
        compiler.typeCheck();
        console.log(compiler.scripts);
        d.resolve(compiler.scripts);
    });
    return d.promise();
}

function stringifyOnce(obj, replacer, indent){
    var printedObjects = [];
    var printedObjectKeys = [];

    function printOnceReplacer(key, value){

        if(value===null) return null;
        if(value===undefined) return undefined;

        var printedObjIndex = false;
        printedObjects.forEach(function(obj, index){
            if(obj===value){
                printedObjIndex = index;
            }
        });

        if(printedObjIndex && typeof(value)=="object"){
            return "(see " + value.constructor.name.toLowerCase() + " with key " + printedObjectKeys[printedObjIndex] + ")";
        }else{
            var qualifiedKey = key || "(empty key)";
            printedObjects.push(value);
            printedObjectKeys.push(qualifiedKey);
            if(replacer){
                return replacer(key, value);
            }else{
                return value;
            }
        }
    }
    return JSON.stringify(obj, printOnceReplacer, indent);
}
