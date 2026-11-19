import { Tier } from '../types';
import { tier1 } from './curriculum/tier1';
import { tier2 } from './curriculum/tier2';
import { tier3 } from './curriculum/tier3';
import { tier4, tier5, tier6, tier7 } from './curriculum/tiers4_7';
import { tier8, tier9, tier10, tier11 } from './curriculum/tiers8_11';
import { enhanceCurriculum } from './curriculumEnhancer';

export const ACADEMY_CURRICULUM: Tier[] = enhanceCurriculum([
  tier1,
  tier2,
  tier3,
  tier4,
  tier5,
  tier6,
  tier7,
  tier8,
  tier9,
  tier10,
  tier11
]);

