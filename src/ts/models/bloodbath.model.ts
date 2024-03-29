import { Death } from './Death/death.model';

export interface Bloodbath {
    settings: {
        aggregatable: boolean;
        download_enabled: boolean;
        list_enabled: boolean;
        stats_enabled: boolean;
        up_to_date: boolean;
        search_messages: {
            regexp: string;
            message: string;
            isError: boolean;
        }[];
    };
    deaths: Death[];
}
