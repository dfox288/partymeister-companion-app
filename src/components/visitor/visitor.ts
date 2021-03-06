import {Component, Input, Output, EventEmitter} from '@angular/core';
import {FormControl} from '@angular/forms';
import {VisitorProvider} from '../../providers/visitor';
import {ModalController, Nav, NavParams} from 'ionic-angular';
import {SignupModalPage} from '../../pages/signup-modal/signup-modal';
import {StorageProvider} from '../../providers/storage';
import {AuthProvider} from '../../providers/auth';
import {RegistrationPage} from '../../pages/registration/registration';

@Component({
    selector: 'visitor-component',
    templateUrl: 'visitor.html'
})
export class VisitorComponent {
    @Output() notifyRefresher: EventEmitter<any> = new EventEmitter();
    @Input() block: any;

    visitors: any[];
    originalVisitors: any[];

    searchTerm: string = '';
    searchControl: FormControl;
    searching: any = false;
    public hideContent: boolean = true;

    public operationType: string = 'remote';
    public forcedOperationType: string = 'remote';

    constructor(public visitorService: VisitorProvider,
                public modalCtrl: ModalController,
                private storageProvider: StorageProvider,
                public authProvider: AuthProvider,
                private navCtrl: Nav) {
        this.searchControl = new FormControl();
    }

    ngOnInit() {
        this.hideContent = true;
        this.visitors = this.block.content.visitors;
        this.originalVisitors = this.block.content.visitors;

        this.setFilteredItems();

        this.searchControl.valueChanges.debounceTime(700).subscribe(search => {
            this.searching = false;
            this.setFilteredItems();
        });

        this.storageProvider.get('operationType').then(res => {
            this.storageProvider.get('forcedOperationType').then(res => {
                this.forcedOperationType = res.toString();
                this.hideContent = false;
            });
            this.operationType = res.toString();
        });
    }

    onSearchInput() {
        this.searching = true;
    }

    setFilteredItems() {
        this.visitors = this.visitorService.filterItems(this.originalVisitors, this.searchTerm);
    }

    presentSignupModal() {
        let signupModal = this.modalCtrl.create(SignupModalPage);
        signupModal.onDidDismiss(data => {
            console.log("Modal closed");
            if (data.refresh == true) {
                this.sendRefreshToParent();
            }
            console.log(data);
        });
        signupModal.present();
    }

    sendRefreshToParent() {
        this.notifyRefresher.emit(true);
    }

    goToRegistrationPage() {
        this.navCtrl.push(RegistrationPage, {title: 'Registration'});
    }
}
