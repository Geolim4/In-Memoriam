const NodeSnackbar = require('node-snackbar');

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Snackbar {
    public show(content: string, actionText: string = 'Fermer'): void {
        NodeSnackbar.show(
            {
                actionText,
                // actionTextColor: '#d85d5d',
                pos: 'bottom-center',
                text: content,
            },
        );
    }
}
