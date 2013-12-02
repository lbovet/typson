/// <reference path="misc/dimension.ts"/>

interface Product {
    name: string;
    dimension?: Dimension;
    category: Category;
}

interface Category {
    name: string;
    level: number;
}
