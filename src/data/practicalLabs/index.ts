import { Lesson, PracticalLab } from '../../types';
import { ACADEMY_CURRICULUM } from '../curriculum';
import { enhanceSinglePracticalLab } from '../curriculumAssessmentEnhancer';
import { TIER_1_LABS } from './tier1Labs';
import { TIERS_2_3_LABS } from './tiers2_3Labs';
import { TIERS_4_11_LABS } from './tiers4_11Labs';

const LESSON_LOOKUP: Map<string, Lesson> = new Map(
  ACADEMY_CURRICULUM.flatMap((tier) =>
    tier.topics.flatMap((topic) =>
      topic.lessons.map((lesson) => [lesson.id, lesson] as [string, Lesson])
    )
  )
);

export const ALL_PRACTICAL_LABS: PracticalLab[] = [
  ...TIER_1_LABS,
  ...TIERS_2_3_LABS,
  ...TIERS_4_11_LABS,
].map((lab) => enhanceSinglePracticalLab(lab, LESSON_LOOKUP));

export const PRACTICAL_LABS_BY_LESSON: Record<string, PracticalLab> = Object.fromEntries(
  ALL_PRACTICAL_LABS.map((lab) => [lab.lessonId, lab])
);

export const PRACTICAL_LABS_BY_ID: Record<string, PracticalLab> = Object.fromEntries(
  ALL_PRACTICAL_LABS.map((lab) => [lab.id, lab])
);

export function getPracticalLabForLesson(lessonId: string): PracticalLab | undefined {
  return PRACTICAL_LABS_BY_LESSON[lessonId];
}

export function getPracticalLabById(exerciseId: string): PracticalLab | undefined {
  return PRACTICAL_LABS_BY_ID[exerciseId];
}
