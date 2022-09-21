export interface FormFilters {
    /**
   * Using an array structure instead of an object
   * was made on purpose to preserve the JSON data
   * structure order which is not always guaranteed
   * @see https://stackoverflow.com/questions/5525795/does-javascript-guarantee-object-property-order/38218582#38218582
   */
    [name: string]: [
        {
            value: string;
            label: string;
            color: string;
            group: string|null;
        }
    ];
}
