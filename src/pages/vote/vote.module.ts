import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {SliderPage} from './slider';
import {TranslateModule} from "@ngx-translate/core";
import {CustomerLoginModalPage} from "../customer-login-modal/customer-login-modal";
import {CustomerActivationModalPage} from "../customer-activation-modal/customer-activation-modal";
import {CustomerActivationLoginModalPage} from "../customer-activation-login-modal/customer-activation-login-modal";
import {IonicImageLoader} from "ionic-image-loader";
import {ComponentsModule} from "../../components/components.module";
import {IntroPage} from "./intro";
import {LiveVotePage} from "./livevote";
import {LoginPage} from "./login";
import {RegistrationPage} from "./registration";
import {SettingsPage} from "./settings";
import {SignupModalPage} from "./signup-modal";
import {TicketPage} from "./ticket";
import {TicketModalPage} from "./ticket-modal";
import {VotePage} from "./vote";

@NgModule({
    declarations: [
        VotePage,
    ],
    entryComponents: [
    ],
    imports: [
        ComponentsModule,
        IonicPageModule.forChild(VotePage),
        IonicImageLoader,

    ],
})
export class VotePageModule {
}
