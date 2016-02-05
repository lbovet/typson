enum enumOptions {
    enumA, // first enumerable value
    enumB // second enumerable value
}

interface MyObject {
    /** A prop that can take any value */
    anyProp: any;
    /**
     * @default 1
     */
    numberProp: number;
    minimumProp: number // @minimum 0
    exclusiveMinimumProp: number // @exclusiveMinimum 0
    maximumProp: number // @maximum 10
    exclusiveMaximumProp: number // @exclusiveMaximum 10
    multipleOfProp: number // @multipleOf 2
    booleanProp: boolean; // @default true
    /**
     * @default
     * A default value
     * It spans multiple lines
     */
    stringProp: string;
    minLengthProp: string; // @minLength 10
    maxLengthProp: string; // @maxLength 100
    patternProp: string; // @pattern ^[a-f0-9]{32}$
    formatProp: string; // @format md5
    itemsProp: any[];
    minItemsProp: any[]; // @minItems 2
    maxItemsProp: any[]; // @maxItems 5
    uniqueItemsProp: any[]; // @uniqueItems 3
    nestedProp: MyNestedObject;
    /**
     * A property which is enumerable
     * @default enumA
     */
    enumProp: enumOptions;
    /**
     * @type object
     * @additionalProperties true
     */
    typeProp: any;
    optionalProp?: string;
    /**
     * @invalidKeyword reject-invalid-keywords
     */
    invalidKeywordProp: string;
}

/**
 * @additionalProperties true
 */
interface MyNestedObject {
}