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

    /**
     * Invoice content
     * @minItems 1
     * @maxItems 50
     */

        lines: InvoiceLine[];

    /** Total dimension of the order */
        dimension: Dimension;
}

interface InvoiceLine {

    product: Product;

    /**
    * @minimum 0
    * @exclusiveMinimum true
    * @maximum 10
    * @exclusiveMaximum false
    * @multipleOf 2
    */
    quantity: number;
}
