import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Compass, Loader2, ShieldAlert, X } from 'lucide-react';
import { LearningExperienceLevel, LearningProfile } from '../../types';
import { SPECIALIST_PATHWAYS } from '../../data/journeyBlueprint';
import {
  getRelevantTopicsForPathway,
  LEARNING_EXPERIENCE_OPTIONS,
  MAX_GOALS_LENGTH,
  PATHWAY_ONBOARDING_DETAILS,
} from '../../lib/learningProfile';

interface LearningPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: LearningProfile;
  isAuthenticated: boolean;
  saving?: boolean;
  error?: string | null;
  onSave: (input: {
    interests: string[];
    experienceLevel: LearningExperienceLevel;
    goals: string;
  }) => Promise<void> | void;
  onSkip: () => Promise<void> | void;
  onClear: () => Promise<void> | void;
}

export default function LearningPreferencesModal({
  isOpen,
  onClose,
  currentProfile,
  isAuthenticated,
  saving = false,
  error = null,
  onSave,
  onSkip,
  onClear,
}: LearningPreferencesModalProps) {
  const [draftInterests, setDraftInterests] = useState<string[]>(currentProfile.interests || []);
  const [draftExperience, setDraftExperience] = useState<LearningExperienceLevel>(
    currentProfile.experienceLevel || 'beginner'
  );
  const [draftGoals, setDraftGoals] = useState<string>(currentProfile.goals || '');

  useEffect(() => {
    if (isOpen) {
      setDraftInterests(currentProfile.interests || []);
      setDraftExperience(currentProfile.experienceLevel || 'beginner');
      setDraftGoals(currentProfile.goals || '');
    }
  }, [isOpen, currentProfile]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const toggleInterest = (pathwayId: string) => {
    setDraftInterests((prev) =>
      prev.includes(pathwayId) ? prev.filter((id) => id !== pathwayId) : [...prev, pathwayId]
    );
  };

  const handleSave = async () => {
    await onSave({
      interests: draftInterests,
      experienceLevel: draftExperience,
      goals: draftGoals.trim().slice(0, MAX_GOALS_LENGTH),
    });
  };

  const handleClearSelections = async () => {
    setDraftInterests([]);
    setDraftGoals('');
    if ((currentProfile.interests || []).length > 0 || (currentProfile.goals || '').trim()) {
      await onClear();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="learning-preferences-title"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-800 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-sky-400">
              <Compass className="h-4 w-4 shrink-0" />
              <span>Optional Learning Preferences</span>
              {!isAuthenticated && (
                <>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-slate-400">Preview mode (sign in to save across sessions)</span>
                </>
              )}
            </div>
            <h2
              id="learning-preferences-title"
              className="text-lg sm:text-xl font-semibold tracking-tight text-slate-100"
            >
              What interests you about cybersecurity?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              You don&apos;t need to choose a career right now. Pick the areas that sound interesting, and we&apos;ll help you explore them.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close learning preferences"
            className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950/70 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-6">
          <p className="text-xs text-slate-400 leading-relaxed">
            You can change interests anytime. Choosing interests only highlights relevant pathways, topics, and unlocked next steps—Stages 1–3 foundations stay shared, and all 11 tiers, 76 lessons, labs, and 4 capstones remain available.
          </p>

          {/* 8 Pathway Multi-Select Grid */}
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold text-slate-200">
                Areas you&apos;d like to explore ({draftInterests.length} selected)
              </h3>
              {draftInterests.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraftInterests([])}
                  disabled={saving}
                  className="text-xs text-sky-400 hover:text-sky-300"
                >
                  Unselect all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SPECIALIST_PATHWAYS.map((pathway) => {
                const isSelected = draftInterests.includes(pathway.id);
                const details = PATHWAY_ONBOARDING_DETAILS[pathway.id];
                const topicPreviews = getRelevantTopicsForPathway(pathway.id);

                return (
                  <button
                    key={pathway.id}
                    type="button"
                    onClick={() => toggleInterest(pathway.id)}
                    aria-pressed={isSelected}
                    disabled={saving}
                    className={`text-left rounded-xl border p-4 transition-colors space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      isSelected
                        ? 'border-sky-400/70 bg-sky-500/10'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-sm font-semibold text-slate-100">
                          {pathway.title}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {details?.plainSummary || pathway.purpose}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium shrink-0 ${
                          isSelected ? 'text-sky-300' : 'text-slate-500'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-sky-400" />
                            <span>Selected</span>
                          </>
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </span>
                    </div>

                    {details?.whatYouDo && (
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <span className="text-slate-300 font-medium">What you&apos;ll explore:</span>{' '}
                        {details.whatYouDo}
                      </p>
                    )}

                    {topicPreviews.length > 0 && (
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        <span className="text-slate-300 font-medium">Related topics:</span>{' '}
                        {topicPreviews.map((t) => `${t.code} ${t.title}`).join(' · ')}
                      </p>
                    )}

                    {pathway.authorizedOnlyNotice && (
                      <p className="text-[11px] text-amber-300/90 inline-flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                        <span>All labs run in safe, authorized simulations.</span>
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Experience Level */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
            <div>
              <h3 className="text-xs font-semibold text-slate-200">
                Current comfort level (optional)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Helps order whether shared Stage 1–3 foundations or early domain previews appear first. Never locks lessons or changes quizzes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {LEARNING_EXPERIENCE_OPTIONS.map((opt) => {
                const active = draftExperience === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDraftExperience(opt.value)}
                    aria-pressed={active}
                    disabled={saving}
                    className={`min-h-[44px] text-left rounded-lg border p-3 transition-colors space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      active
                        ? 'border-sky-400/70 bg-sky-500/10 text-slate-100'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                      <span>{opt.label}</span>
                      {active && <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Non-PII Learning Goal */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="learning-goal-input" className="text-xs font-semibold text-slate-200">
                Personal learning goal (optional)
              </label>
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                {draftGoals.length}/{MAX_GOALS_LENGTH}
              </span>
            </div>
            <input
              id="learning-goal-input"
              type="text"
              value={draftGoals}
              maxLength={MAX_GOALS_LENGTH}
              disabled={saving}
              onChange={(e) => setDraftGoals(e.target.value)}
              placeholder="e.g., Understand how web logins work and try the SOC capstone"
              className="w-full min-h-[44px] rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3.5 py-2.5 text-xs text-rose-200"
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 sm:px-6 border-t border-slate-800 bg-slate-950/70 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void onSkip()}
              disabled={saving}
              className="min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-slate-100 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              Skip for now
            </button>
            {(draftInterests.length > 0 ||
              draftGoals.trim().length > 0 ||
              (currentProfile.interests || []).length > 0) && (
              <button
                type="button"
                onClick={() => void handleClearSelections()}
                disabled={saving}
                className="min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
              >
                Clear selections
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="min-h-[44px] sm:min-h-[40px] inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
