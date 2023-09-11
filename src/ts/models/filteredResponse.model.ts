import { Bloodbath } from './bloodbath.model';

export interface FilteredResponse {
    response: Bloodbath;
    errored: boolean;
    error?: Error;
    original_response: Bloodbath;
}
