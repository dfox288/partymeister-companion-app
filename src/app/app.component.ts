import {Component, ViewChild} from '@angular/core';
import {Platform, MenuController, Nav, AlertController} from 'ionic-angular';

// Plugins
import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';
import {Network} from '@ionic-native/network';
import {OneSignal} from '@ionic-native/onesignal';

// Pages
import {ContentPage} from '../pages/content/content';
import {SettingsPage} from '../pages/settings/settings';
import {IntroPage} from '../pages/intro/intro';
import {LoginPage} from '../pages/login/login';
import {EntryPage} from '../pages/entry/entry';
import {TicketPage} from '../pages/ticket/ticket';
import {LiveVotePage} from '../pages/livevote/livevote';
import {VotePage} from '../pages/vote/vote';
import {RegistrationPage} from '../pages/registration/registration';

// Modules
import ImgCache           from 'imgcache.js';

// Providers and services
import {NavigationProvider} from '../providers/navigation';
import {CacheService} from "ionic-cache/ionic-cache";
import {SettingsProvider} from '../providers/settings';
import {StorageProvider} from '../providers/storage';
import {LinkService} from '../services/link';
import {AuthProvider} from '../providers/auth';
import {ConnectivityService} from '../providers/connectivity-service';

let components = {
    'ContentPage': ContentPage,
    'SettingsPage': SettingsPage,
    'RegistrationPage': RegistrationPage,
    'IntroPage': IntroPage,
    'LoginPage': LoginPage,
    'EntryPage': EntryPage,
    'LiveVotePage': LiveVotePage,
    'VotePage': VotePage,
    'TicketPage': TicketPage,
};

@Component({
    templateUrl: 'app.html'
})
export class PartyMeisterCompanionApp {
    @ViewChild(Nav) nav: Nav;

    pages: Array<{ title: string, component: any, params?: any, children: any[] }>;
    showSubmenu: {};
    public operationType: string = 'remote';
    private initialized: boolean = false;

    menuItemHandler(page): void {
        this.showSubmenu[page.title] = !this.showSubmenu[page.title];

        // close all other submenus
        for (var i in this.showSubmenu) {
            if (this.showSubmenu.hasOwnProperty(i) && i != page.title) {
                this.showSubmenu[i] = false;
            }
        }
    }

    constructor(public platform: Platform,
                public menu: MenuController,
                private navigationProvider: NavigationProvider,
                private cache: CacheService,
                public menuCtrl: MenuController,
                private storageProvider: StorageProvider,
                private linkService: LinkService,
                public authProvider: AuthProvider,
                private connectivityService: ConnectivityService,
                private splashScreen: SplashScreen,
                private statusBar: StatusBar,
                private oneSignal: OneSignal,
                private network: Network,
                private alertCtrl: AlertController,
                private cacheService: CacheService) {

        this.cache.setDefaultTTL(60 * 60); //set default cache TTL for 1 hour

        this.navigationProvider.operationType().subscribe(operationType => {
            this.storageProvider.get('forcedOperationType').then(forcedOperationType => {
                let actualOperationType = operationType;
                if (forcedOperationType != false && forcedOperationType != null) {
                    this.storageProvider.set('operationType', forcedOperationType);
                    actualOperationType = forcedOperationType;
                } else {
                    this.storageProvider.set('operationType', operationType);
                }
                this.loadNavigation(actualOperationType);

            });
        }, err => {
            // Load local menu as a fallback
            navigationProvider.loadOffline('remote').subscribe(navigationItems => {
                this.storageProvider.set('operationType', 'remote');
                let result = navigationProvider.parseItems(navigationItems, components);
                this.showSubmenu = result.submenu;
                this.pages = result.pages;
                this.initializeApp();
            });
        });

        this.navigationProvider.updated$.subscribe(operationType => {
            this.loadNavigation(operationType);
        });

        linkService.linkClicked$.subscribe(
            data => {
                let targetPage = linkService.searchPage(this.pages, data.link);
                if (targetPage != null) {
                    if (data.root) {
                        this.openPage(targetPage);
                        this.menuCtrl.open();
                    } else {
                        this.nav.push(targetPage.component, targetPage.params);
                    }
                }
            });
    }

    loadNavigation(operationType) {
        this.navigationProvider.load(operationType).subscribe(navigationItems => {
            let result = this.navigationProvider.parseItems(navigationItems, components, this.showSubmenu);
            this.showSubmenu = result.submenu;
            this.pages = result.pages;
            this.initializeApp();
        });
    }

    initializeApp() {
        if (this.initialized == true) {
            return;
        }
        this.platform.ready().then(() => {
            this.initialized = true;

            // Okay, so the platform is ready and our plugins are available.
            // Here you can do any higher level native things you might need.
            this.statusBar.styleBlackOpaque();
            this.splashScreen.hide();

            this.addConnectivityListeners();
            if (this.platform.is('cordova')) {
                this.addOneSignalConfiguration();
            }

            // activated debug mode
            ImgCache.options.debug = true;
            // page is set until img cache has started
            ImgCache.init(() => {
                    this.storageProvider.get('introShown').then(res => {
                        console.log('Introshown: '+ res);
                        if (res !== true) {
                            console.log("Showing intro page");
                            this.nav.setRoot(IntroPage);
                            this.splashScreen.hide();
                        } else {
                            this.storageProvider.get('operationType').then(operationType => {
                                if (operationType == 'local') {
                                    this.linkService.clickLink(SettingsProvider.variables.DEFAULT_PAGE_LOCAL, true);
                                } else {
                                    this.linkService.clickLink(SettingsProvider.variables.DEFAULT_PAGE_REMOTE, true);
                                }
                                this.menuCtrl.open();
                                this.splashScreen.hide();
                            });
                        }
                    });
                },
                () => {
                    console.error('ImgCache init: error! Check the log for errors');
                });

            if (SettingsProvider.variables.environment == 'dev') {
                this.cacheService.clearAll();
                console.log('Developer mode - clearing all observable caches');
            }
        });

        this.platform.registerBackButtonAction(() => {
            console.log("Back button Action registered");
            if (this.menuCtrl.isOpen()) {
                this.menuCtrl.close();
                return;
            }
            if (!this.nav.canGoBack()) {
                let alert = this.alertCtrl.create({
                    title: 'Exit?',
                    message: 'Do you want to exit the app?',
                    buttons: [
                        {
                            text: 'Cancel',
                            role: 'cancel',
                            handler: () => {
                                alert = null;
                            }
                        },
                        {
                            text: 'Exit',
                            handler: () => {
                                this.platform.exitApp();
                            }
                        }
                    ]
                });
                alert.present();
                return;
            }
            this.nav.pop();
        });
    }

    addOneSignalConfiguration() {
        this.oneSignal.startInit('3fdb8164-8438-4afb-b4f4-95ec317ebd88', '794542674802');

        this.oneSignal.inFocusDisplaying(this.oneSignal.OSInFocusDisplayOption.InAppAlert);

        this.oneSignal.handleNotificationReceived().subscribe(() => {
            // do something when notification is received
        });

        this.oneSignal.handleNotificationOpened().subscribe(() => {
            // do something when a notification is opened
        });

        this.oneSignal.endInit();
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

        let disconnectSubscription = this.network.onDisconnect().subscribe(() => {
            console.log('network DISconnected!');
            this.connectivityService.online = false;
        });

        let connectSubscription = this.network.onConnect().subscribe(() => {
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
            this.linkService.clickLink(SettingsProvider.variables.DEFAULT_LOGOUT_PAGE, true);
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