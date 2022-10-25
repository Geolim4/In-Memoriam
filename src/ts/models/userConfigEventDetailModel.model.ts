import { UserConfig } from './userConfig.model';

export interface UserConfigEventDetailModel {
    userConfig: UserConfig;
    eventParameters: {
        forceRedraw: boolean;
    };
}
