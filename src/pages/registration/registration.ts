import {Component, OpaqueToken} from '@angular/core';
import {NavController, NavParams} from 'ionic-angular';
import {Validators, FormBuilder, FormGroup} from '@angular/forms';
import {BarcodeScanner} from '@ionic-native/barcode-scanner';
import {CountryProvider} from '../../providers/country';
import {AlertController} from 'ionic-angular';
import {ContentPage} from '../content/content';
import {MasterPage} from '../master/master';

@Component({
    selector: 'page-registration',
    templateUrl: 'registration.html',
})

export class RegistrationPage extends MasterPage {
    private form: FormGroup;
    public countries: any[] = [];

    constructor(
        private alertCtrl: AlertController,
        public navCtrl: NavController,
        public navParams: NavParams,
        private formBuilder: FormBuilder,
        private barcodeScanner: BarcodeScanner,
        private countryProvider: CountryProvider
    ) {
        super(navCtrl, navParams);

        this.form = this.formBuilder.group({
            login: ['', Validators.compose([Validators.required, Validators.minLength(2)])],
            groups: [''],
            country: ['DE', Validators.required],
            access_key: ['', Validators.required],
            password: ['', Validators.compose([Validators.required, Validators.minLength(3)])],
            password_repeat: ['', Validators.compose([Validators.required, Validators.minLength(3)])]
        }, {validator: RegistrationPage.matchPasswords});

        this.countries = countryProvider.getCountries();

        this.form.valueChanges.subscribe(data => {
            this.form.patchValue({access_key: data.access_key.toUpperCase()}, {onlySelf: true, emitEvent: false});
        })

    }

    static matchPasswords(cg: FormGroup): {[err: string]: any} {
        let pwd1 = cg.get('password');
        let pwd2 = cg.get('password_repeat');
        let rv: {[error: string]: any} = {};
        if ((pwd1.touched || pwd2.touched) && pwd1.value !== pwd2.value) {
            rv['passwordMismatch'] = true;
        }

        return rv;
    }

    openCamera(event) {

        this.barcodeScanner.scan().then((barcodeData) => {
            this.form.patchValue({access_key: barcodeData.text});
        }, (err) => {
            // An error occurred
        });
        event.stopPropagation();
    }

    submit() {
        this.authProvider.registrationRequest(this.form.value)
            .subscribe(result => {
                    this.authProvider.doLogin(result.json().data).then(res => {
                        this.navCtrl.setRoot(ContentPage, {
                            title: "Visitors",
                            url: "https://local.revision-party.net/visitors.json",
                            force: true
                        });
                    });
                },
                err => {
                    let alert = this.alertCtrl.create({
                        title: 'Registration unsuccessful :(',
                        subTitle: 'Looks like this access key or this handle was already used before',
                        buttons: ['OK']
                    });
                    alert.present();
                }
            );
    }
}
