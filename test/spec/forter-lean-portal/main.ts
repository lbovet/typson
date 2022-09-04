/**
 * The request object containing information about the customer and order needed by Forter in order to provide a decision
 * @metadata.endpoint /v2/orders/:id
 * @metadata.method ["POST"]
 * @_leanRequired orderId
 */
interface Transaction {
    /**
     * Unique order/transaction identifier
     * @default 2356fdse0rr489
     * @maxLength 40
     */
    orderId: string;
    /**
     * @_hiddenFor #1234
     */
    orderType: string;
    /**
     * @_visibleFor preauth
     * @_optionalFor magento2
     * @_hiddenByDefault
     */
    authorizationStep: string
    /**
     * @_requiredIfAvailable
     * @_useForExample
     */
    accountOwner?: string
    /**
     * hidden from schema
     * @_leanHidden
     */
    iAhidden: string

}
