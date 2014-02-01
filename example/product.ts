/// <reference path="misc/dimension.ts"/>

enum Origin {
    Local, // From here
    Imported // From elsewhere
}

interface Product {
    /**
     * Uniquely defines the product
     * @pattern [A-Z][a-z][0-9]_
     */
    name: string;

    /** How big it is */
    dimension?: Dimension;

    /** Classification */
    category: Category;

    /** Where is it from? */
    origin: Origin;
}

interface WeightedProduct extends Product {
    weight: number;
}

interface Category {
    /** Uniquely identifies the category */
    name: string;

    /** Classification level from 1 to 5 (highest)
     * @type integer */
    level: number;
}

interface CategoryIndex {
    categories: { [key: string]: Category };
    products: { [key: string]: Product[] };
}
