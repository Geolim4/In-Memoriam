export interface Definition {
  [name: string]: {
    [name: string]: {
      singular: string;
      plural: string;
    } | string;
  };
}
