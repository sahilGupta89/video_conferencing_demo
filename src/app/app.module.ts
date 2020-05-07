import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

// import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CameraComponent } from './camera/camera.component'
import { SharedModule } from './shared';

// import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import {WebRTCChatComponent} from './webrtc/webrtc-chat.component'
import { FormsModule } from '@angular/forms';

// const config: SocketIoConfig = { url: 'http://192.168.2.8:5003', options: {autoConnect: false} };

@NgModule({
  declarations: [
    AppComponent,
    CameraComponent,
    WebRTCChatComponent
  ],
  imports: [
    BrowserModule,
    // AppRoutingModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    BrowserAnimationsModule,
    // SocketIoModule.forRoot(config),
    FormsModule,
    SharedModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
