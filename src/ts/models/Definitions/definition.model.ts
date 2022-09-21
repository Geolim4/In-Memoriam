export interface Definition {
    '#any'?: string;
    '#counter_property'?: string;
    '#counter_strategy'?: string;
    '#exposed'?: boolean;
    '#label': string;
    '#name'?: string;
    '#name_plural'?: string;
    '#number': {
        [name: string]: {
            none: string;
            singular: string;
            plural: string;
        };
    };
}
