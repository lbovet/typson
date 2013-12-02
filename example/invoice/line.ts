/// <reference path="../misc/dimension.ts"/>
/// <reference path="../product.ts"/>

interface Invoice {
    /** Who will pay? */
    customer: string;
    /** Invoice content **/
    lines: InvoiceLine[];
    /** Total dimension of the order **/
    dimension: Dimension;
}

interface InvoiceLine {
    product: Product;
    quantity: number;
}
