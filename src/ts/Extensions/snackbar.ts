const NodeSnackbar = require('node-snackbar');

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Snackbar {
    protected latestSnabackar: string;

    public show(content: string, actionText: string = 'Fermer', isError: boolean = false, duration: number = null, position: string = 'bottom-center'): void {
        this.latestSnabackar = content;
        NodeSnackbar.show(
            {
                actionText,
                actionTextColor: isError ? '#481919' : '#4CAF50',
                backgroundColor: isError ? '#a94442' : '#323232',
                duration: duration || (isError ? 8000 : 5000),
                pos: position,
                text: content,
                textColor: '#FFF',
            },
        );
    }

    public close(content: string = null): void {
        if (content === null || content === this.latestSnabackar) {
            NodeSnackbar.close();
        }
    }
}
