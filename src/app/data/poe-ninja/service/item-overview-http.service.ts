import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BrowserService, LoggerService, SessionService } from '@app/service';
import { environment } from '@env/environment';
import { Observable, of, throwError } from 'rxjs';
import { delay, flatMap, retryWhen } from 'rxjs/operators';
import { ItemOverviewResponse } from '../schema/item-overview';

export enum ItemOverviewType {
    Prophecy = 'Prophecy',
    DivinationCard = 'DivinationCard',
    Watchstone = 'Watchstone',
    Incubator = 'Incubator',
    Essence = 'Essence',
    Oil = 'Oil',
    Resonator = 'Resonator',
    UniqueJewel = 'UniqueJewel',
    UniqueFlask = 'UniqueFlask',
    UniqueWeapon = 'UniqueWeapon',
    UniqueArmour = 'UniqueArmour',
    UniqueAccessory = 'UniqueAccessory',
    Beast = 'Beast',
    Fossil = 'Fossil',
    Map = 'Map',
    UniqueMap = 'UniqueMap'
}

const PATH_TYPE_MAP = {
    [ItemOverviewType.Prophecy]: 'prophecies',
    [ItemOverviewType.DivinationCard]: 'divinationcards',
    [ItemOverviewType.Watchstone]: 'watchstones',
    [ItemOverviewType.Incubator]: 'incubators',
    [ItemOverviewType.Essence]: 'essences',
    [ItemOverviewType.Oil]: 'oils',
    [ItemOverviewType.Resonator]: 'resonators',
    [ItemOverviewType.UniqueJewel]: 'unique-jewels',
    [ItemOverviewType.UniqueFlask]: 'unique-flaks',
    [ItemOverviewType.UniqueWeapon]: 'unique-weapons',
    [ItemOverviewType.UniqueArmour]: 'unique-armours',
    [ItemOverviewType.UniqueAccessory]: 'unique-accessories',
    [ItemOverviewType.Beast]: 'beats',
    [ItemOverviewType.Fossil]: 'fossils',
    [ItemOverviewType.Map]: 'maps',
    [ItemOverviewType.UniqueMap]: 'unique-maps',
};

const RETRY_COUNT = 3;
const RETRY_DELAY = 100;

@Injectable({
    providedIn: 'root'
})
export class ItemOverviewHttpService {
    private readonly apiUrl: string;

    constructor(
        private readonly httpClient: HttpClient,
        private readonly browser: BrowserService,
        private readonly session: SessionService,
        private readonly logger: LoggerService) {
        this.apiUrl = `${environment.poeNinja.baseUrl}/api/data/itemoverview`;
    }

    public get(leagueId: string, type: ItemOverviewType): Observable<ItemOverviewResponse> {
        const params = new HttpParams({
            fromObject: {
                league: leagueId,
                type,
                language: 'en'
            }
        });
        return this.httpClient.get<ItemOverviewResponse>(this.apiUrl, {
            params
        }).pipe(
            retryWhen(errors => errors.pipe(
                flatMap((response, count) => this.handleError(this.apiUrl, response, count))
            )),
            flatMap(response => {
                if (!response.lines) {
                    this.logger.warn(`Got empty result from ${this.apiUrl} with ${leagueId} and ${type}.`, response);
                    return throwError(`Got empty result from ${this.apiUrl} with ${leagueId} and ${type}.`)
                }

                const result: ItemOverviewResponse = {
                    ...response,
                    url: `${environment.poeNinja.baseUrl}/challenge/${PATH_TYPE_MAP[type]}`
                };
                return of(result);
            })
        );
    }

    private handleError(url: string, response: HttpErrorResponse, count: number): Observable<void> {
        if (count >= RETRY_COUNT) {
            return throwError(response);
        }

        switch (response.status) {
            case 403:
                return this.browser.retrieve(url);
            default:
                return this.session.clear().pipe(delay(RETRY_DELAY));
        }
    }
}
