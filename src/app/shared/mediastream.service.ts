import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MediastreamService {
  private mediaStream: MediaStream = undefined;
  public async getMediaStream(): Promise<MediaStream> {
    if (!this.mediaStream) {
      try {
        const stream = await navigator.mediaDevices
          .getUserMedia({
            audio: true,
            video: true
          });
        return Promise.resolve(stream);
      }
      catch (err) {
        console.error('Error accessing the hardware:', err);
        return Promise.reject(err);
      }
    } else {
      return Promise.resolve(this.mediaStream);
    }
  }
}
