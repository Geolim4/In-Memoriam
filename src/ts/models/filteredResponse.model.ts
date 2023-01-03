import { Bloodbath } from './bloodbath.model';

export interface FilteredResponse {
    response: Bloodbath;
    errored: boolean;
    original_response: Bloodbath;
}
