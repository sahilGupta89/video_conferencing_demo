import { Component,AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';

import { WebrtcClientConnectionService } from './webrtc-client-connection.service';
import { WebrtcClientStoreService } from './webrtc-client.store.service'
// import { WebRTCClient } from './webrtc-client.model';

@Component({
    selector: 'webrtc-chat',
    templateUrl: './webrtc-chat.component.html'
})
export class WebRTCChatComponent implements AfterViewInit{
    @ViewChild("video") video: ElementRef;
    public webrtcClients: any[];
    private blobs: string[] = [];
    public isConnected:Boolean=false;

    constructor(
        private webrtcClientStoreService: WebrtcClientStoreService,
        private webrtcConnectionService: WebrtcClientConnectionService,
        private sanitizer: DomSanitizer
    ) { }

    ngOnInit() {
        this.webrtcClientStoreService.clients$.subscribe(
            (clientList) => {this.webrtcClients = clientList
                if(!this.webrtcClients){
                    this.isConnected = false
                }
                if(this.webrtcClients && this.webrtcClients.length){
                    this.isConnected = true
                }
                console.log('this.webrtcClients', this.webrtcClients)},
            (err) => {
                console.error('Error updating the client list:', err)
            }
        );
    }

    ngAfterViewInit() {
        // this.video.nativeElement.innerHTML
    }

    public onClickConnectToRoom() {
        this.webrtcClients = null
        this.webrtcConnectionService.connectToRoom();
        setTimeout(() => {
            let element = this.video.nativeElement.children[0].children[0]
            if(element){
                element.muted = "muted";
                console.log('muted')
                this.isConnected = true}
        }, 1000);
    }


    public onClickLeaveRoom(){
        if(this.webrtcClients || this.webrtcClients.length){
            this.webrtcConnectionService.disconnectBroadcast()
            // this.webrtcClients.forEach(element => {
            //     this.webrtcClientStoreService.removeClient(element.id)
            // });
        }
        this.isConnected = false
    }

    // DEPRECATED
    // public getVideoStreamURL(stream: MediaStream): SafeResourceUrl {
    //     return this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(stream));
    // }
}