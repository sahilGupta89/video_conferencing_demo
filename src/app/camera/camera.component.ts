import { Component, OnInit, ViewChild } from '@angular/core'
import { Socket } from 'ngx-socket-io'
import { Observable, throwError, concat } from 'rxjs'
// import { async } from '@angular/core/testing'
// import { ChatService } from '../chat.service'
// import { Stream } from 'stream'

@Component({
  selector: 'app-camera',
  templateUrl: './camera.component.html',
  styleUrls: ['./camera.component.css']
})


export class CameraComponent implements OnInit {
  @ViewChild('localVideo') localVideo: any
  @ViewChild('remoteVideo') remoteVideo: any
  isNegotiating = false;
  showLocalVideo: boolean = true
  showRemoteVideo: boolean = true
  localElement: any
  remoteElement: any
  pc: RTCPeerConnection
  localStream: MediaStream
  remoteStream: MediaStream
  TURN_SERVER_URL = '18.191.90.243:3478';
  TURN_SERVER_USERNAME = 'username';
  TURN_SERVER_CREDENTIAL = 'credential';
  PC_CONFIG = {
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302"] },
      // {
      //   urls: 'turn:' + this.TURN_SERVER_URL + '?transport=tcp',
      //   username: this.TURN_SERVER_USERNAME,
      //   credential: this.TURN_SERVER_CREDENTIAL
      // },
      // {
      //   urls: 'turn:' + this.TURN_SERVER_URL + '?transport=udp',
      //   username: this.TURN_SERVER_USERNAME,
      //   credential: this.TURN_SERVER_CREDENTIAL
      // }
    ]
  }
  // remoteStreamElement: any

  constructor(private socket: Socket) {
    this.socket.connect()
    this.socket.on('data',(data)=>{
      console.log('receiving')
      this.handleSignalingData(data)
    })
    this.socket.on('ready',(message)=>{
      console.log('ready')
      this.createPeerConnection()
    })
  }

  ngOnInit(): void {
    // this.getData().subscribe((data: any) => {
    //   console.log('Data received: ', data);
    //   this.handleSignalingData(data)
    // })

    // this.readyState().subscribe(() => {
    //   console.log('catch ready')
    //   // this.messageList.push(message)
    //   this.createPeerConnection();
    //   // this.sendOffer();
    // })

  }

  ngAfterViewInit() {
    this.localElement = this.localVideo.nativeElement
    this.remoteElement = this.remoteVideo.nativeElement
    
  }

  hangup = () => {
    if (this.pc) {
      // if (this.pc.iceConnectionState === "disconnected") {
      this.pc.ontrack = null
      this.pc.onicecandidate = null
      if (this.remoteVideo.srcObject) {
        this.remoteVideo.srcObject.getTracks().forEach(track => { track.stop() })
      }
      if (this.localVideo.srcObject) {
        this.localVideo.srcObject.getTracks().forEach(track => track.stop());
      }
      // this.remoteVideo.removeAttribute("src")
      // this.remoteVideo.removeAttribute("srcObject")
      // this.localVideo.removeAttribute("srcObject")
      // this.localVideo.removeAttribute("src")
      this.pc.close()
      this.socket.disconnect()
      this.showRemoteVideo = false;  // Our code to shut down the call
      // }
    }
  }

  start = async () => {
    // if (this.pc) {
    //   alert('you cannot start call , as you are already in call')
    // } else {
      try{
        const stream = await navigator.mediaDevices.getUserMedia({audio: false, video: true});
        stream.getTracks().forEach((track) => this.pc.addTrack(track, stream));
        this.localElement.srcObject = stream;
        this.socket.connect()
      }catch(err){
        console.error(err);
      }
      // this.createPeerConnection()
      // navigator.mediaDevices.getUserMedia({ audio: false, video: true })
      //   .then((stream) => {
      //     console.log('Stream found')
      //     this.localStream = stream
      //     if (this.localStream) {
      //       this.localElement.srcObject = stream
      //       // this.localElement = this.localVideo.nativeElement
      //     }
      //     // this.localElement.srcObject = stream
      //     // this.localStream.getTracks().forEach((track: MediaStreamTrack) => {
      //     //   this.pc.addTrack(track, stream)
      //     // })
      //     this.socket.connect()
      //   })
      //   .catch(error => {
      //     console.error('Stream not found: ', error)
      //   })
    // }
  }

  // call = () => {
  //   console.log('Starting call');
  //   const videoTracks = this.localStream.getVideoTracks();
  //   const audioTracks = this.localStream.getAudioTracks();
  //   if (videoTracks.length > 0) {
  //     console.log(`Using Video device: ${videoTracks[0].label}`);
  //   }
  //   if (audioTracks.length > 0) {
  //     console.log(`Using Audio device: ${audioTracks[0].label}`);
  //   }
  // }


  createPeerConnection() {
    try {
      this.pc = new RTCPeerConnection(this.PC_CONFIG)
      this.pc.onicecandidate = this.onIceCandidate
      this.pc.onnegotiationneeded = async () => {
        try {
          await this.pc.setLocalDescription(await this.pc.createOffer( {
            offerToReceiveAudio: false,
            offerToReceiveVideo: true
          }));
          // send the offer to the other peer
          this.sendData({desc: this.pc.localDescription});
        } catch (err) {
          console.error(err);
        }
      };

      this.pc.ontrack = (event) => {
        if (event.streams.length) {
          this.showRemoteVideo = true
          this.remoteElement.srcObject = event['streams'][0]
        }
      }

      // this.localStream.getTracks().forEach((track: MediaStreamTrack) => {
      //   this.pc.addTrack(track, this.localStream)
      // })
      console.log('PeerConnection created')
    } catch (error) {
      console.error('PeerConnection failed: ', error)
    }
  }

  sendOffer = () => {
    console.log('Send offer')
    this.pc.createOffer().then(
      this.setAndSendLocalDescription,
      (error) => { console.error('Send offer failed: ', error) }
    )
  }

  sendAnswer = () => {
    console.log('Send answer')
    this.pc.createAnswer().then(
      this.setAndSendLocalDescription,
      (error) => { console.error('Send answer failed: ', error) }
    )
  }

  public setAndSendLocalDescription = (sessionDescription: RTCSessionDescriptionInit) => {
    this.pc.setLocalDescription(sessionDescription)
    console.log('Local description set')
    this.sendData(sessionDescription)
  }

  onIceCandidate = (event: { candidate: any }) => {
    if (event.candidate) {
      console.log('ICE candidate')
      this.sendData({
        candidate: event.candidate
      })
    }
  }

  addIceCandidate(data: { type?: any; candidate?: any }) {
    // console.log('candidate',data.candidate)
    if (data.candidate !== null) {
      console.log('Ice connection state', this.pc.iceConnectionState)
      this.pc.addIceCandidate(new RTCIceCandidate(data.candidate))
    }
  }

  public handleSignalingData = async ({desc,candidate}) => {
    try {
      if (desc) {
        // debugger
        // if we get an offer, we need to reply with an answer
        if (desc.type == 'offer') {
          await this.pc.setRemoteDescription(desc);
          const stream = await navigator.mediaDevices.getUserMedia({audio:false,video:true});
          stream.getTracks().forEach((track) => {
            this.pc.addTrack(track, stream)
            this.pc.addTransceiver(track,{
              direction: "sendrecv",
              streams: [stream],
              sendEncodings: [
                  { rid: "h", active: true, maxBitrate: 900000 },
                  { rid: "m", active: true, maxBitrate: 300000, scaleResolutionDownBy: 2 }
              ]
            })
          });
          await this.pc.setLocalDescription(await this.pc.createAnswer());
          this.sendData({desc: this.pc.localDescription});
        } else if (desc.type == 'answer') {
          await this.pc.setRemoteDescription(desc);
        } else {
          console.log('Unsupported SDP type. Your code may differ here.');
        }
      } else if (candidate) {
        await this.pc.addIceCandidate(candidate);
      }
    } catch (err) {
      console.error(err);
    }
    // if (data) {
    //   switch (data.type) {
    //     case 'offer':
    //       this.createPeerConnection()
    //       this.pc.setRemoteDescription(new RTCSessionDescription(data));
    //       this.sendAnswer()
    //       break
    //     case 'answer':
    //       this.pc.setRemoteDescription(new RTCSessionDescription(data));
    //       break
    //     case 'candidate':
    //       this.addIceCandidate(data)
    //       break
    //   }
    // }

  }

  public sendData(data) {
    this.socket.emit('data', data)
  }

  // public getData = () => {
  //   return Observable.create((observer: { next: (arg0: { desc: any; candidate: any }) => void }) => {
  //     this.socket.on('data', (data: { desc: any; candidate: any }) => {
  //       // console.log('received>>>>>>>>>>>>>>>>', data)
  //       this.handleSignalingData(data)
  //       observer.next(data)
  //     })
  //   })
  // }

  // public readyState() {
  //   return Observable.create((observer) => {
  //     this.socket.on('ready', (data: any) => {
  //       console.log('Ready')
  //       // this.createPeerConnection()
  //       // this.sendOffer()
  //       observer.next(data)
  //     })
  //   })

  // }
}