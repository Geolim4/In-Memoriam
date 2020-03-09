export interface Definition {
  [name: string]: {
    '#any'?: string,
    '#counter_property'?: string,
    '#counter_strategy'?: string,
    '#label': string,
    [name: string]: {
      none: string;
      singular: string;
      plural: string;
    } | string;
  };
}
