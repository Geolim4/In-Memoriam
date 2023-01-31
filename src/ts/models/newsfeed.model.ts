export interface Newsfeed {
    code: string;
    title: string;
    content: string;
    type: 'snackbar'|'modal';
    once: boolean;
    isError: boolean;
}
