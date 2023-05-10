import { File } from './file.model';

export interface Image extends File {
    kind: 'image';
    desc: string;
    origin: string;
}
