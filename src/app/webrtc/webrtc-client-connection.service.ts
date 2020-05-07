import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
// import { Subject, Observable, Observer } from 'rxjs';
import * as io from 'socket.io-client';
import { WebrtcClientStoreService } from './webrtc-client.store.service';
import { IWebRTCClient } from './webrtc-client.model';
import {
  SOCKET_EVENT_PEER_CONNECTED,
  SOCKET_EVENT_PEER_DISCONNECTED,
  SOCKET_EVENT_PEER_MESSAGE,
  SOCKET_EVENT_CONNECT_TO_ROOM,
  RTC_PEER_MESSAGE_ICE,
  RTC_PEER_MESSAGE_SDP_ANSWER,
  RTC_PEER_MESSAGE_SDP_OFFER
} from './webrtc-event-messages';
import { MediastreamService } from '../shared/mediastream.service';
// import { element } from 'protractor';
// import { async } from '@angular/core/testing';
// import { Socket } from 'ngx-socket-io';


@Injectable({
  providedIn: 'root'
})
export class WebrtcClientConnectionService {
  private socket: SocketIOClient.Socket;
  private peerConnections: RTCPeerConnection[] = [];
  private myMediaStream: MediaStream = undefined;
  private peerId: string;
  private isNegotiating = false
  private webrtcClients: any
  private joined: boolean = false

  TURN_SERVER_URL = environment.TURN_SERVER_URL;
  TURN_SERVER_USERNAME = environment.TURN_SERVER_USERNAME;
  TURN_SERVER_CREDENTIAL = environment.TURN_SERVER_CREDENTIAL;
  PC_CONFIG = {
    iceServers: [
      { urls: [environment.STUN] },
      {
        urls: 'turn:' + this.TURN_SERVER_URL + '?transport=tcp',
        username: this.TURN_SERVER_USERNAME,
        credential: this.TURN_SERVER_CREDENTIAL
      },
      {
        urls: 'turn:' + this.TURN_SERVER_URL + '?transport=udp',
        username: this.TURN_SERVER_USERNAME,
        credential: this.TURN_SERVER_CREDENTIAL
      }
    ]
  }

  constructor(
    private webrtcClientStore: WebrtcClientStoreService,
    private mediaStream: MediastreamService
  ) {
    this.socket = io.connect(environment.SOCKET_URL)
    this.socket.on('connect', () => {
      console.log('Socket connected. I am', this.socket.id);
      this.peerId = this.socket.id;
    });

    this.socket.on('disconnect', (data) => {
      console.log('Socket disconnected. I was', this.socket.id);
    });

    this.socket.on(SOCKET_EVENT_PEER_CONNECTED, (data: { id: string; }) => {
      if (this.peerId != data.id && this.joined) {
        this.makeOffer(data.id);
      }
    });

    this.socket.on(SOCKET_EVENT_PEER_DISCONNECTED, (data: any) => {
      // todo
      console.log('peer disconnected', data, this.webrtcClients)

      this.disconnectPeer(data)
    });

    this.socket.on(SOCKET_EVENT_PEER_MESSAGE, (data) => {
      this.handleRTCPeerMessage(data);
    });

    this.webrtcClientStore.clients$.subscribe(
      (clientList) => {
        this.webrtcClients = clientList
        if (!this.webrtcClients) {
        }
      },
      (err) => {
        console.error('Error updating the client list:', err)
      }
    );
  }


  public connectToRoom() {
    debugger
    this.closePeerIfClientListEmpty()
    this.mediaStream
      .getMediaStream()
      .then((stream: MediaStream) => {
        this.myMediaStream = stream;
        this.socket.emit(SOCKET_EVENT_CONNECT_TO_ROOM);
        this.joined = true
        // add myself to the list
        const me: IWebRTCClient = { id: this.socket.id, stream: this.myMediaStream };
        this.webrtcClientStore.addClient(me);
      })
      .catch(err => console.error('Can\'t get media stream', err));
  }

  public disconnectBroadcast() {
    // this.peerConnections[this.peerId].close()
    this.joined = false
    this.removeAllTracks()
    this.socket.emit(SOCKET_EVENT_PEER_DISCONNECTED, { id: this.peerId })
    console.log('================= i am disconnecting===============', this.peerId)
  }

  public removeAllTracks() {
    if (this.webrtcClients && this.webrtcClients.length) {
      this.webrtcClients.forEach(element => {
        const tracks = element.stream.getTracks()
        tracks.forEach(function (track) {
          track.stop();
        });
        this.webrtcClientStore.removeClient(element.id)
      });
    }
  }

  public removeTrack(remove_id) {
    if (this.webrtcClients && this.webrtcClients.length) {
      this.webrtcClients.forEach(element => {
        if (element.id === remove_id) {
          const tracks = element.stream.getTracks()
          tracks.forEach(function (track) {
            track.stop();
          });
        }
      });
    }
  }

  closePeerIfClientListEmpty() {
    if (!this.webrtcClients || (this.webrtcClients && !this.webrtcClients.length)) {
      this.peerConnections = []
      console.log('peer connection closed>>>>>>>>>>>>>>>>>>>.', this.peerConnections)
    }
  }


  public disconnectPeer(data) {
    debugger
    if (this.webrtcClients && this.webrtcClients.length) {
      this.removeTrack(data.id)
      this.webrtcClientStore.removeClient(data.id)
      if(this.peerConnections[data.id])
          this.peerConnections[data.id].close()
    }
  }

  private makeOffer(clientId: string) {
    const pc = this.getPeerConnection(clientId);
    const options = {
      iceRestart: true,
      mandatory: {
        offerToReceiveVideo: true,
        offerToReceiveAudio: true
      }
    };

    pc
      .createOffer(options.mandatory)
      .then(async (sdp: RTCSessionDescriptionInit) => {
        await pc.setLocalDescription(sdp)
        console.log('sending sdp-offer from : ', this.peerId, 'to : ', clientId)
        this.socket.emit(SOCKET_EVENT_PEER_MESSAGE, {
          by: this.peerId,
          to: clientId,
          sdp: sdp,
          type: RTC_PEER_MESSAGE_SDP_OFFER
        });
      })
  }

  private handleRTCPeerMessage(message) {

    const pc = this.getPeerConnection(message.by);

    switch (message.type) {
      case RTC_PEER_MESSAGE_SDP_OFFER:
        pc
          .setRemoteDescription(new RTCSessionDescription(message.sdp))
          .then(async () => {
            // console.log('Setting remote description by offer');
            // phone is ringing dude
            const sdp = await pc.createAnswer();
            await pc.setLocalDescription(sdp);
            // console.log('sending sdp-answer from : ', this.peerId, 'to : ', message.by)
            this.socket.emit(SOCKET_EVENT_PEER_MESSAGE, {
              by: this.peerId,
              to: message.by,
              sdp: sdp,
              type: RTC_PEER_MESSAGE_SDP_ANSWER
            });
          })
          .catch(err => {
            console.error('Error on SDP-Offer:', err);
          });
        break;
      case RTC_PEER_MESSAGE_SDP_ANSWER:
        if (this.isNegotiating) {
          // console.log('receiving sdp-answer from : ', message.by, 'to: ', message.to)
          pc
            .setRemoteDescription(new RTCSessionDescription(message.sdp))
            .then(() => console.log('Setting remote description by answer'))
            .catch(err => console.error('Error on SDP-Answer:', err));
        }
        break;
      case RTC_PEER_MESSAGE_ICE:
        if (message.ice) {
          // console.log('receiving ICE : ', message.by, 'to: ', message.to)
          // console.log('Adding ice candidate');
          pc.addIceCandidate(message.ice);
        }
        break;
    }
  }

  private getPeerConnection(id: string): RTCPeerConnection {
    if (this.peerConnections[id]) {
      // console.log('peer connection already exist for:', id)
      return this.peerConnections[id];
    }

    const pc = new RTCPeerConnection(this.PC_CONFIG);
    this.peerConnections[id] = pc;
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {

      if (event.candidate) {
        // console.log('sending ice candidate++++++++++++++++++')
        this.socket.emit(SOCKET_EVENT_PEER_MESSAGE, {
          by: this.peerId,
          to: id,
          ice: event.candidate,
          type: RTC_PEER_MESSAGE_ICE
        })
      }
    };

    pc.onnegotiationneeded = () => {
      // console.log('Need negotiation:', id);
      if (this.isNegotiating) {
        console.log("SKIP nested negotiations");
        return;
      }
      this.isNegotiating = true;

    }

    pc.onsignalingstatechange = () => {
      console.log('ICE signaling state changed to:', pc.signalingState, 'for client', id);
      this.isNegotiating = (pc.signalingState != "stable");
    }

    pc.onicegatheringstatechange = () => {
      console.log('ICE gathering state change to:', pc.iceGatheringState, 'for Client', id);
    }

    pc.onconnectionstatechange = () => {
      console.log('Peer connection state change to:', pc.connectionState, 'for client', id);
      // if (pc.connectionState == 'failed') {
      //   setTimeout(() => {
      //     if(pc.connectionState=== 'disconnected')
      //         this.socket.emit(SOCKET_EVENT_PEER_DISCONNECTED, { id: id })
      //   }, 1000);
      // }
      // if (pc.connectionState == 'disconnected') {
      //   setTimeout(() => {
      //     if(pc.connectionState=== 'disconnected')
      //         this.socket.emit(SOCKET_EVENT_PEER_DISCONNECTED, { id: id })
      //   }, 1000);
      // }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state change to:', pc.iceConnectionState, 'for client', id);
      // if (pc.iceConnectionState === "failed") {
      //   pc.restartIce()
      // }
    }


    // Workaround for Chrome 
    // see: https://github.com/webrtc/adapter/issues/361
    if (window.navigator.userAgent.toLowerCase().indexOf('chrome') > - 1) { // Chrome
      // DEPECRATED https://developer.mozilla.org/de/docs/Web/API/RTCPeerConnection/addStream
      if (this.myMediaStream) {
        (pc as any).addStream(this.myMediaStream);
        (pc as any).onaddstream = (event: { stream: any; }) => {
          // console.log('Received new stream chrome');
          const client = { id: id, stream: event.stream };
          this.webrtcClientStore.addClient(client);
        };
      }
    } else {  // Firefox
      if (this.mediaStream) {
        pc.addTrack(this.myMediaStream.getVideoTracks()[0], this.myMediaStream);
        pc.ontrack = (event: RTCTrackEvent) => {
          console.log('Received new stream chrome2');
          const client = { id: id, stream: event.streams[0] };
          this.webrtcClientStore.addClient(client);
        }
      }
    }
    // console.log('new peer connection created for: ', id)
    return pc;
  }
}
