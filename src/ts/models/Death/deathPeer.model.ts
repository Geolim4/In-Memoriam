import { DeathModelBase } from './deathModelBase';

export class DeathPeer extends DeathModelBase {
    public constructor(deathPeerModel: DeathModelBase) {
        super();
        Object.assign(this, deathPeerModel);
    }
}
