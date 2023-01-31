import Cookies from 'js-cookie';
import { App } from '../app';
import { Newsfeed as NewsfeedModel } from '../models/newsfeed.model';

/**
 * @author Georges.L <contact@geolim4.com>
 * @licence GPL-2.0
 */
export class Newsfeed {
    public static load(): void {
        fetch(App.getInstance().getConfigFactory().config.newsfeedSrc, { cache: 'default' })
            .then((response): any => response.json())
            .then((responseData: { newsfeed: NewsfeedModel[]}): void => {
                this.handleNewsfeed(responseData.newsfeed);
            }).catch((e): void => {
                if (App.getInstance().getConfigFactory().isDebugEnabled()) {
                    console.error(`Failed to load the newsfeed: ${e}`);
                }
                App.getInstance().getModal().modalInfo(
                    'Erreur',
                    "Impossible de récupérer le flux d'actualité.",
                    { isError: true },
                );
            });
    }

    protected static handleNewsfeed(newsfeed: NewsfeedModel[]): void {
        newsfeed.forEach((newsfeed: NewsfeedModel): void => {
            const cookieName = `newsfeed-${newsfeed.code}-sent`;

            if (newsfeed.once && Cookies.get('cookiebar') === 'CookieAllowed') {
                if (!Cookies.get(cookieName)) {
                    Cookies.set(
                        cookieName,
                        1,
                        { expires: new Date(new Date().setMonth(new Date().getMonth() + 1)), sameSite: 'strict' },
                    );
                } else {
                    return;
                }
            }

            switch (newsfeed.type) {
                case 'modal':
                    App.getInstance().getModal().modalInfo(
                        newsfeed.title,
                        newsfeed.content,
                        {
                            isError: newsfeed.isError,
                        },
                    );
                    break;

                case 'snackbar':
                    App.getInstance().getSnackbar().show(
                        newsfeed.content,
                        'Fermer',
                        newsfeed.isError,
                        12000,
                        'top-center',
                    );
                    break;
                default:
                    if (App.getInstance().getConfigFactory().isDebugEnabled()) {
                        console.error(`Unknown newsfeed type "${newsfeed.type}" for newsfeed "${newsfeed.code}"`);
                    }
                    break;
            }
        });
    }
}
