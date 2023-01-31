const NodeSnackbar = require('node-snackbar');

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Snackbar {
    protected latestSnabackar: string;
    protected snackbarOpened : boolean = false;
    protected snackbarStack: { [name: string]: any }[] = [];

    public show(content: string, actionText: string = 'Fermer', isError: boolean = false, duration: number = null, position: string = 'bottom-center'): void {
        this.latestSnabackar = content;
        const options = {
            actionText,
            actionTextColor: isError ? '#481919' : '#4CAF50',
            backgroundColor: isError ? '#a94442' : '#323232',
            duration: duration || (isError ? 8000 : 5000),
            onClose: (): void => {
                const options = this.snackbarStack.shift();
                if (options !== undefined) {
                    NodeSnackbar.show(options);
                }
                this.snackbarOpened = false;
            },
            pos: position,
            text: content,
            textColor: '#FFF',
        };

        if (!this.snackbarOpened) {
            NodeSnackbar.show(options);
            this.snackbarOpened = true;
        } else {
            this.snackbarStack.push(options);
        }
    }

    public close(content: string = null): void {
        if (content === null || content === this.latestSnabackar) {
            NodeSnackbar.close();
        }
    }
}
