import {Injectable, Inject} from '@angular/core';
import {EnvVariables} from '../app/environment-variables/environment-variables.token';

@Injectable()
export class SettingsProvider {
    public static variables: any;

    constructor(@Inject(EnvVariables) public envVariables) {
        SettingsProvider.variables = envVariables;
    }
}