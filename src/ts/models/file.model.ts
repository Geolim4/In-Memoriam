export interface File {
    kind: 'generic'|'image'|'video';
    directory: string;
    filename: string;
    desc: string|null;
    origin: string|null;
    licence: string|null;
}
