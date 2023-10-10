export interface FormFilter {
    value: string; // Real option value used for filter
    label: string; // Real option label used for filter
    color: string; // Chart color
    group: string|null; // Select Optgroup
    setup: string|null; // Conditional expression to display the value
    param: string|null; // Public parameter for permalink
}

export interface FormFilters {
    /**
   * Using an array structure instead of an object
   * was made on purpose to preserve the JSON data
   * structure order which is not always guaranteed
   * @see https://stackoverflow.com/questions/5525795/does-javascript-guarantee-object-property-order/38218582#38218582
   */
    [name: string]: FormFilter[];
}
