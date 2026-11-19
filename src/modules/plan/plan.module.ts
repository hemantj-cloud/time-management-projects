import { Module } from '@nitrostack/core';
import { PlanTools } from './plan.tools.js';

@Module({
  name: 'plan',
  description: 'Find and compare projects',
  controllers: [PlanTools],
})
export class PlanModule {}
