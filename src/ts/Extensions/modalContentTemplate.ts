/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class ModalContentTemplate {
    private contentTemplate : string;

    private variables : object;

    public constructor(contentTemplate: string, variables: object) {
        this.contentTemplate = `modals/${contentTemplate}`;
        this.variables = variables;
    }

    public getContentTemplate(): string {
        return this.contentTemplate;
    }

    public getVariables(): object {
        return this.variables;
    }
}
