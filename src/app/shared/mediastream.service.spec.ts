import { TestBed } from '@angular/core/testing';

import { MediastreamService } from './mediastream.service';

describe('MediastreamService', () => {
  let service: MediastreamService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MediastreamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
