/// <reference path="../misc/dimension.ts"/>
/// <reference path="../product.ts"/>

/**
 * Represents the document sent to the customer for payment.
 */
interface Invoice {
    /**
     * Who will pay?
     * Not me! éàè
     */
    customer: string;
    /** Invoice content */
    lines: InvoiceLine[];
    /** Total dimension of the order */
    dimension: Dimension;
}

interface InvoiceLine {
    product: Product;
    quantity: number;
}
