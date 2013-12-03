/// <reference path="misc/dimension.ts"/>

interface Product {
    /** Uniquely defines the product */
    name: string;
    /** How big it is */
    dimension?: Dimension;
    /** Classification */
    category: Category;
}

interface Category {
    /** Uniquely identifies the category */
    name: string;
    /** Classification level from 1 to 5 (highest) */
    level: number;
}
