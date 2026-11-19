import { Module } from '@nitrostack/core';
import { TrackTools } from './track.tools.js';

@Module({
  name: 'track',
  description: 'Log time and review progress',
  controllers: [TrackTools],
})
export class TrackModule {}
