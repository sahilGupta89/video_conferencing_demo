import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from "rxjs";
// import { List } from "immutable";

// import { WebRTCClient } from './webrtc-client.model';
import { IWebRTCClient } from './webrtc-client.model';
import { has } from 'immutable';


@Injectable({
  providedIn: 'root'
})
export class WebrtcClientStoreService {
  private _clients: BehaviorSubject<any> = new BehaviorSubject<IWebRTCClient[]>([]);
  private dataStore: { clients: IWebRTCClient[] } = { clients: [] };
  readonly clients = this._clients.asObservable();

  constructor() { }
  public get clients$() {
    return this._clients.asObservable();
  }

  public addClient(newClient: IWebRTCClient) {
    this.removeClient(newClient.id)
    this.dataStore.clients.push(newClient)
    this._clients.next(Object.assign({}, this.dataStore).clients);
  }

  public removeClient(clientId: string) {
    let clientList = this._clients.getValue();
    let c = clientList.filter((objFromA)=>  objFromA.id != clientId)
    this.dataStore.clients = c;

    // const removeIndex = this.dataStore.clients.findIndex(c => c.id === clientId)
    // if(removeIndex >-1){
      
    //   if (this.dataStore.clients.length >1){
    //     this.dataStore.clients = this.dataStore.clients.splice(removeIndex, 1)
    //     this._clients.next(Object.assign({}, this.dataStore).clients)
    //   }else if (this.dataStore.clients.length == 1){
    //     this.dataStore.clients.pop()
    //   }
    //   else {
        this._clients.next(Object.assign({}, this.dataStore).clients)
    //   }
    // }
  }
}
