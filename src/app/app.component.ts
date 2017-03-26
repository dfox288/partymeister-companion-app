import {Component, ViewChild, Input} from '@angular/core';
import {Platform, MenuController, Nav} from 'ionic-angular';
import {StatusBar, Splashscreen} from 'ionic-native';
import {CacheService} from "ionic-cache/ionic-cache";

import {ContentPage} from '../pages/content/content';
import {SettingsPage} from '../pages/settings/settings';
import {IntroPage} from '../pages/intro/intro';
import {LoginPage} from '../pages/login/login';
import {EntryPage} from '../pages/entry/entry';
import {LiveVotePage} from '../pages/livevote/livevote';
import {VotePage} from '../pages/vote/vote';
import {RegistrationPage} from '../pages/registration/registration';
import {NavigationProvider} from '../providers/navigation';
import ImgCache           from 'imgcache.js';
import {SettingsProvider} from '../providers/settings';
import {LinkService} from '../services/link';
import {Storage} from '@ionic/storage';
import {AuthProvider} from '../providers/auth';
import {ConnectivityService} from '../providers/connectivity-service';
import {Network} from 'ionic-native';
import {OneSignal} from 'ionic-native';

let components = {
    'ContentPage': ContentPage,
    'SettingsPage': SettingsPage,
    'RegistrationPage': RegistrationPage,
    'IntroPage': IntroPage,
    'LoginPage': LoginPage,
    'EntryPage': EntryPage,
    'LiveVotePage': LiveVotePage,
    'VotePage': VotePage,
};

@Component({
    templateUrl: 'app.html'
})
export class PartyMeisterCompanionApp {
    @ViewChild(Nav) nav: Nav;

    rootPage: any = ContentPage;
    pages: Array<{ title: string, component: any, params?: any, children: any[] }>;
    showSubmenu: {};
    public operationType: string = 'remote';

    menuItemHandler(page): void {
        this.showSubmenu[page.title] = !this.showSubmenu[page.title];
    }

    constructor(public platform: Platform,
                public menu: MenuController,
                private navigationProvider: NavigationProvider,
                private cache: CacheService,
                public menuCtrl: MenuController,
                private storage: Storage,
                private linkService: LinkService,
                public authProvider: AuthProvider,
                private connectivityService: ConnectivityService) {

        this.cache.setDefaultTTL(60 * 60); //set default cache TTL for 1 hour

        this.navigationProvider.operationType().subscribe(operationType => {
            this.storage.get('forcedOperationType').then(forcedOperationType => {
                let actualOperationType = operationType;
                if (forcedOperationType != false && forcedOperationType != null) {
                    this.storage.set('operationType', forcedOperationType);
                    actualOperationType = forcedOperationType;
                } else {
                    this.storage.set('operationType', operationType);
                }
                this.loadNavigation(actualOperationType);

            });
        }, err => {
            // Load local menu as a fallback
            navigationProvider.loadOffline('remote').subscribe(navigationItems => {
                this.storage.set('operationType', 'remote');
                let result = navigationProvider.parseItems(navigationItems, components);
                this.showSubmenu = result.submenu;
                this.pages = result.pages;
            });
        });

        this.navigationProvider.updated$.subscribe( operationType => {
            this.loadNavigation(operationType);
        });

        linkService.linkClicked$.subscribe(
            data => {
                let targetPage: any = null;
                // find link
                for (let page of this.pages) {
                    if (page.params != undefined && page.params.url != undefined) {
                        if (page.params.url == data.link) {
                            targetPage = page;
                        }
                    }
                    if (page.children.length > 0) {
                        for (let child of page.children) {
                            if (child.params != undefined && child.params.url != undefined) {
                                if (child.params.url == data.link) {
                                    targetPage = child;
                                }
                            }
                        }
                    }
                }
                if (targetPage != null) {
                    if (data.root) {
                        this.openPage(targetPage);
                        this.menuCtrl.open();
                    } else {
                        this.nav.push(targetPage.component, targetPage.params);
                    }
                }
            });

        this.initializeApp();
    }

    loadNavigation(operationType) {
        this.navigationProvider.load(operationType).subscribe(navigationItems => {
            let result =  this.navigationProvider.parseItems(navigationItems, components, this.showSubmenu);
            this.showSubmenu = result.submenu;
            this.pages = result.pages;
        });
    }

    initializeApp() {
        this.platform.ready().then(() => {

            // Okay, so the platform is ready and our plugins are available.
            // Here you can do any higher level native things you might need.
            StatusBar.styleDefault();
            Splashscreen.hide();

            this.addConnectivityListeners();
            if (this.platform.is('cordova')) {
                this.addOneSignalConfiguration();
            }

            // activated debug mode
            ImgCache.options.debug = true;
            // page is set until img cache has started
            ImgCache.init(() => {
                    if (this.authProvider.isAuthenticated()) {
                        this.nav.setRoot(ContentPage, {
                            "url": "https://2017.revision-party.net/frontend/default/en/app_about/app_visitors.json",
                            "title": "Visitors"
                        });
                        this.menuCtrl.open();
                    } else {
                        this.storage.get('introShown').then((result) => {
                            if (result == null) {
                                this.nav.setRoot(IntroPage);
                            } else {
                                this.nav.setRoot(ContentPage, {
                                    "url": "https://2017.revision-party.net/app_at_a_glance.json",
                                    "title": "Revision At A Glance"
                                });
                                this.menuCtrl.open();
                            }
                        });
                    }
                },
                () => {
                    console.error('ImgCache init: error! Check the log for errors');
                });
        });
    }

    addOneSignalConfiguration() {
        OneSignal.startInit('3fdb8164-8438-4afb-b4f4-95ec317ebd88', '794542674802');

        OneSignal.inFocusDisplaying(OneSignal.OSInFocusDisplayOption.InAppAlert);

        OneSignal.handleNotificationReceived().subscribe(() => {
            // do something when notification is received
        });

        OneSignal.handleNotificationOpened().subscribe(() => {
            // do something when a notification is opened
        });

        OneSignal.endInit();
    }

    addConnectivityListeners() {
        let onOnline = () => {
            console.log("ONLINE");
            this.connectivityService.online = true;
        };

        let onOffline = () => {
            console.log("OFFLINE");
            this.connectivityService.online = false;
        };

        window.addEventListener('online', onOnline, false);
        window.addEventListener('offline', onOffline, false);

        let disconnectSubscription = Network.onDisconnect().subscribe(() => {
            console.log('network DISconnected!');
            this.connectivityService.online = false;
        });

        let connectSubscription = Network.onConnect().subscribe(() => {
            // We just got a connection but we need to wait briefly
            // before we determine the connection type.  Might need to wait 
            // prior to doing any api requests as well.
            setTimeout(() => {
                console.log('network connected!');
                this.connectivityService.online = true;
            }, 3000);
        });
    }

    isAuthenticated() {
        return this.authProvider.isAuthenticated();
    }

    showPage(p) {
        if (!p.params) {
            return true;
        }
        if (!p.params.isProtected && this.isAuthenticated() && p.params.hideWhenLoggedIn) {
            return false;
        }
        if (p.params.isProtected && !this.isAuthenticated()) {
            return false;
        }
        return true;
    }

    openPage(page) {
        if (page.callFunction == 'doLogout') {
            this.authProvider.doLogout();
            this.storage.get('operationType').then(res => {
                if (res == null || res == 'remote') {
                    this.linkService.clickLink(SettingsProvider.variables.DEFAULT_PAGE_REMOTE, true);
                } else {
                    this.linkService.clickLink(SettingsProvider.variables.DEFAULT_PAGE_LOCAL, true);
                }
            });
            return;
        }
        if (page.children && page.children.length > 0) {
            return;
        }
        // close the menu when clicking a link from the menu
        this.menu.close();
        // navigate to the new page if it is not the current page
        this.nav.setRoot(page.component, page.params);
    }
}
