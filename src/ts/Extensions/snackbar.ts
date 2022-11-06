const NodeSnackbar = require('node-snackbar');

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Snackbar {
    public show(content: string, actionText: string = 'Fermer', isError: boolean = false): void {
        NodeSnackbar.show(
            {
                actionText,
                actionTextColor: isError ? '#481919' : '#4CAF50',
                backgroundColor: isError ? '#a94442' : '#323232',
                duration: isError ? 8000 : 5000,
                pos: 'bottom-center',
                text: content,
                textColor: '#FFF',
            },
        );
    }

    public close(): void {
        NodeSnackbar.close();
    }
}
