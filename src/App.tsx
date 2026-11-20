/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Tracks from './components/Tracks';
import LessonPlayer from './components/LessonPlayer';
import LabScratchpad from './components/LabScratchpad';
import CommunityForum from './components/CommunityForum';
import AuthModal from './components/AuthModal';
import LandingPage from './components/LandingPage';
import AiTutorPanel from './components/AiTutorPanel';
import Capstones from './components/Capstones';
import LearningPreferencesModal from './components/journey/LearningPreferencesModal';
import { MessageSquare } from 'lucide-react';

import { LEGACY_LESSON_ID_MAP, resolveCanonicalLessonId } from './data/curriculumMetadata';
import { computeCurriculumStats } from './lib/curriculumProgress';
import { createDefaultLearningProfile, normalizeLearningProfile } from './lib/learningProfile';
import {
  DEFAULT_PROGRESS,
  DEFAULT_LAB_NOTES,
  DEFAULT_COMMUNITY_POSTS,
  DEFAULT_TIMELINE_EVENTS,
} from './data/initialState';
import {
  User,
  PublicDirectoryUser,
  UserProgress,
  LabExplorationMap,
  LabExplorationProgress,
  CapstoneProgressMap,
  LabNote,
  CommunityPost,
  TimelineEvent,
  EngageSubmissionPayload,
  Tier,
  PracticalLab,
  EngageApiResponse,
  LearningExperienceLevel,
  LearningProfile,
} from './types';
import {
  apiGetCurriculum,
  apiGetUsers,
  apiGetPosts,
  apiGetTimeline,
  apiGetLabNotes,
  apiSyncProgress,
  apiSaveLabNote,
  apiDeleteLabNote,
  apiCreatePost,
  apiVotePost,
  apiFollowUser,
  apiActiveEngage,
  apiLogout,
  apiGetMe,
  apiInitCsrf,
  apiUpdateLearningProfile,
  setUnauthorizedHandler,
  clearClientAuthMemory,
} from './lib/api';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authHydrating, setAuthHydrating] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('landing');

  const [selectedLessonId, setSelectedLessonIdState] = useState<string>('comp-hardware');
  const [selectedTierId, setSelectedTierId] = useState<string>('tier-1');
  const [tracksViewMode, setTracksViewMode] = useState<'journey' | 'tiers'>('journey');
  const [selectedStageId, setSelectedStageId] = useState<string>('stage-1');

  const setSelectedLessonId = (lessonId: string) => {
    setSelectedLessonIdState(resolveCanonicalLessonId(lessonId));
  };

  useEffect(() => {
    if (user && activeTab === 'landing') {
      setActiveTab('dashboard');
    }
  }, [user, activeTab]);

  const [operatorDirectory, setOperatorDirectory] = useState<PublicDirectoryUser[]>([]);
  const [curriculum, setCurriculum] = useState<Tier[]>([]);
  const [labs, setLabs] = useState<PracticalLab[]>([]);
  const [curriculumLoading, setCurriculumLoading] = useState<boolean>(true);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(DEFAULT_TIMELINE_EVENTS);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(DEFAULT_COMMUNITY_POSTS);
  const [labNotes, setLabNotes] = useState<LabNote[]>(DEFAULT_LAB_NOTES);
  const [labExploration, setLabExploration] = useState<LabExplorationMap>({});
  const [capstoneProgress, setCapstoneProgress] = useState<CapstoneProgressMap>({});
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [guestLearningProfile, setGuestLearningProfile] = useState<LearningProfile>(() =>
    createDefaultLearningProfile()
  );
  const [preferencesModalOpen, setPreferencesModalOpen] = useState<boolean>(false);
  const [preferencesSaving, setPreferencesSaving] = useState<boolean>(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  const activeLearningProfile: LearningProfile = user
    ? normalizeLearningProfile(user.learningProfile)
    : guestLearningProfile;

  const [terminalConfigs, setTerminalConfigs] = useState<Record<string, string>>(() => {
    const cached = localStorage.getItem('cfa_terminal_configs');
    if (!cached) return {};
    try {
      const parsed = JSON.parse(cached) as Record<string, string>;
      const migrated: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed)) {
        const canonicalKey = LEGACY_LESSON_ID_MAP[key] || key;
        if (!migrated[canonicalKey]) {
          migrated[canonicalKey] = value;
        }
      }
      return migrated;
    } catch {
      return {};
    }
  });

  const [globalAiTutorOpen, setGlobalAiTutorOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('cfa_terminal_configs', JSON.stringify(terminalConfigs));
  }, [terminalConfigs]);

  const resetClientSessionState = React.useCallback((openLoginPrompt = false) => {
    clearClientAuthMemory();
    setUser(null);
    setProgress(DEFAULT_PROGRESS);
    setLabNotes(DEFAULT_LAB_NOTES);
    setLabExploration({});
    setCapstoneProgress({});
    setGuestLearningProfile(createDefaultLearningProfile());
    setPreferencesModalOpen(false);
    setGlobalAiTutorOpen(false);
    setActiveTab((prev) => (prev === 'tracks' ? 'tracks' : 'landing'));
    if (openLoginPrompt) {
      setAuthModalOpen(true);
    }
    apiInitCsrf().catch(() => {});
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      resetClientSessionState(true);
    });
    return () => setUnauthorizedHandler(null);
  }, [resetClientSessionState]);

  useEffect(() => {
    let active = true;
    apiGetMe()
      .then((session) => {
        if (!active) return;
        if (session) {
          setUser(session.user);
          setProgress({
            ...DEFAULT_PROGRESS,
            ...session.progress,
          });
          setLabExploration(session.labExploration || {});
          setCapstoneProgress(session.capstoneProgress || {});
        } else {
          apiInitCsrf().catch(() => {});
        }
      })
      .catch((err) => {
        console.error('Session hydration failed', err);
        apiInitCsrf().catch(() => {});
      })
      .finally(() => {
        if (active) {
          setAuthHydrating(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const loadCurriculum = React.useCallback(() => {
    setCurriculumLoading(true);
    setCurriculumError(null);
    apiGetCurriculum()
      .then((payload) => {
        setCurriculum(payload.curriculum || []);
        setLabs(payload.labs || []);
      })
      .catch((err) => {
        console.error('Curriculum sync failed', err);
        setCurriculumError(err?.message || 'Unable to load curriculum from server.');
      })
      .finally(() => {
        setCurriculumLoading(false);
      });
  }, []);

  useEffect(() => {
    loadCurriculum();
    apiGetUsers().then(setOperatorDirectory).catch((err) => console.error('Directory sync failed', err));
    apiGetPosts().then(setCommunityPosts).catch((err) => console.error('Posts sync failed', err));
    apiGetTimeline().then(setTimelineEvents).catch((err) => console.error('Timeline sync failed', err));
  }, [loadCurriculum]);

  useEffect(() => {
    if (user) {
      apiGetLabNotes()
        .then(setLabNotes)
        .catch((err) => {
          if (
            err.status === 401 ||
            err.status === 404 ||
            err.message?.includes('Account not found') ||
            err.message?.includes('Unauthorized') ||
            err.message?.includes('Session')
          ) {
            handleLogOut();
          } else {
            console.error('Lab notes sync failed', err);
          }
        });

      apiSyncProgress()
        .then((res) => {
          setUser(res.user);
          setProgress(res.progress);
        })
        .catch((err) => {
          if (
            err.status === 401 ||
            err.status === 404 ||
            err.message?.includes('Account not found') ||
            err.message?.includes('Unauthorized') ||
            err.message?.includes('Session')
          ) {
            handleLogOut();
          } else {
            console.error('Metrics sync failed', err);
          }
        });
    }
  }, [user?.id]);

  const labsByLesson = React.useMemo(() => {
    const map: Record<string, PracticalLab> = {};
    for (const lab of labs) {
      map[lab.lessonId] = lab;
    }
    return map;
  }, [labs]);

  const curriculumStats = React.useMemo(
    () => computeCurriculumStats(curriculum, progress),
    [curriculum, progress]
  );
  const totalLessons = curriculumStats.totalLessons;

  const currentLessonInfo = React.useMemo(() => {
    for (const tier of curriculum) {
      for (const topic of tier.topics) {
        const found = topic.lessons.find((l) => l.id === selectedLessonId);
        if (found) {
          return {
            lesson: found,
            topicTitle: topic.title,
            tierNumber: tier.number,
          };
        }
      }
    }
    const firstTier = curriculum[0];
    const firstTopic = firstTier?.topics[0];
    const firstLesson = firstTopic?.lessons[0];
    return {
      lesson: firstLesson,
      topicTitle: firstTopic?.title || 'Computer & OS Foundations',
      tierNumber: firstTier?.number || 1,
    };
  }, [curriculum, selectedLessonId]);

  const currentExercise = currentLessonInfo.lesson
    ? labsByLesson[currentLessonInfo.lesson.id]
    : undefined;

  const handleTabChange = (tab: string) => {
    if (!user && tab !== 'tracks' && tab !== 'landing') {
      setAuthModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleToggleGlobalTutor = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setGlobalAiTutorOpen((prev) => !prev);
  };

  const triggerActiveEngagement = async (
    engagementType: 'open_lesson' | 'submit_quiz' | 'verify_homework' | 'complete_exercise',
    lessonId: string,
    payload?: EngageSubmissionPayload
  ): Promise<EngageApiResponse | null> => {
    if (!user) return null;
    const prevXp = user.xp || 0;

    const res = await apiActiveEngage(engagementType, lessonId, payload);
    setUser(res.user);
    setProgress(res.progress);
    apiGetUsers().then(setOperatorDirectory).catch(() => {});

    if ((res.user.xp || 0) > prevXp) {
      apiGetTimeline().then(setTimelineEvents).catch(() => {});
    }
    return res;
  };

  const saveLabNote = (updatedNote: LabNote) => {
    if (!user) return;

    setLabNotes((prev) => {
      const exists = prev.some((n) => n.id === updatedNote.id);
      return exists
        ? prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
        : [updatedNote, ...prev];
    });

    apiSaveLabNote(updatedNote)
      .then(setLabNotes)
      .catch((err) => console.error('Save lab note failed', err));
  };

  const deleteLabNote = (id: string) => {
    if (!user) return;

    setLabNotes((prev) => prev.filter((n) => n.id !== id));

    apiDeleteLabNote(id).catch((err) => {
      console.error('Delete lab note failed', err);
      apiGetLabNotes().then(setLabNotes).catch(() => {});
    });
  };

  const savePost = (newPost: CommunityPost) => {
    if (!user) return;

    apiCreatePost({
      title: newPost.title,
      content: newPost.content,
      category: newPost.category,
      authorRole: newPost.authorRole,
    })
      .then((savedPost) => {
        const { user: updatedUser, progress: updatedProgress, ...postData } = savedPost;
        setCommunityPosts((prev) => [postData as CommunityPost, ...prev]);

        if (updatedUser && updatedProgress) {
          setUser(updatedUser);
          setProgress(updatedProgress);
          apiGetUsers().then(setOperatorDirectory).catch(() => {});
        }

        apiGetTimeline().then(setTimelineEvents).catch(() => {});
      })
      .catch((err) => console.error('Broadcast post failed', err));
  };

  const updatePostVotes = (postId: string, voteType: 'up' | 'down' | null) => {
    if (!user) return;

    apiVotePost(postId, voteType)
      .then((updatedPost) => {
        setCommunityPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)));
      })
      .catch((err) => console.error('Vote failed', err));
  };

  const saveTerminalConfig = (moduleId: string, text: string) => {
    if (!user) return;
    setTerminalConfigs((prev) => ({
      ...prev,
      [moduleId]: text,
    }));
  };

  const followUser = (targetUsername: string) => {
    if (!user) return;

    apiFollowUser(targetUsername)
      .then((following) => {
        setUser((prev) => (prev ? { ...prev, following } : null));
        apiGetUsers().then(setOperatorDirectory).catch(() => {});
      })
      .catch((err) => console.error('Follow failed', err));
  };

  const handleLogOut = () => {
    apiLogout()
      .catch(() => {})
      .finally(() => {
        apiInitCsrf().catch(() => {});
        apiGetPosts().then(setCommunityPosts).catch(() => {});
      });
    setUser(null);
    setProgress({
      completedLessonIds: [],
      completedExerciseIds: [],
      completedQuizLessonIds: [],
      completedHomeworkLessonIds: [],
      xp: 0,
      streak: 0,
      lastActiveDate: null,
    });
    setLabNotes(DEFAULT_LAB_NOTES);
    setLabExploration({});
    setCapstoneProgress({});
    setGlobalAiTutorOpen(false);
    setActiveTab('landing');
  };

  const handleUpdateLabExploration = React.useCallback(
    (labId: string, state: LabExplorationProgress) => {
      setLabExploration((prev) => ({
        ...prev,
        [labId]: state,
      }));
    },
    []
  );

  const handleCapstoneStateUpdate = React.useCallback(
    (payload: {
      user?: User;
      progress?: UserProgress;
      capstoneProgress?: CapstoneProgressMap;
    }) => {
      if (payload.user) setUser(payload.user);
      if (payload.progress) setProgress(payload.progress);
      if (payload.capstoneProgress) setCapstoneProgress(payload.capstoneProgress);
      if (payload.user) {
        apiGetUsers().then(setOperatorDirectory).catch(() => {});
        apiGetTimeline().then(setTimelineEvents).catch(() => {});
      }
    },
    []
  );

  const handleSaveLearningPreferences = React.useCallback(
    async (input: {
      interests: string[];
      experienceLevel: LearningExperienceLevel;
      goals: string;
    }) => {
      setPreferencesError(null);
      if (!user) {
        setGuestLearningProfile({
          interests: input.interests,
          experienceLevel: input.experienceLevel,
          goals: input.goals,
          onboardingCompleted: true,
          updatedAt: new Date().toISOString(),
        });
        setPreferencesModalOpen(false);
        return;
      }

      setPreferencesSaving(true);
      try {
        const res = await apiUpdateLearningProfile({
          action: 'save',
          interests: input.interests,
          experienceLevel: input.experienceLevel,
          goals: input.goals,
          onboardingCompleted: true,
        });
        setUser(res.user);
        setPreferencesModalOpen(false);
      } catch (err: any) {
        setPreferencesError(err?.message || 'Unable to save learning preferences.');
      } finally {
        setPreferencesSaving(false);
      }
    },
    [user]
  );

  const handleSkipOnboarding = React.useCallback(async () => {
    setPreferencesError(null);
    if (!user) {
      setGuestLearningProfile((prev) => ({
        ...prev,
        interests: [],
        goals: '',
        onboardingCompleted: true,
        updatedAt: new Date().toISOString(),
      }));
      setPreferencesModalOpen(false);
      return;
    }

    setPreferencesSaving(true);
    try {
      const res = await apiUpdateLearningProfile({ action: 'skip' });
      setUser(res.user);
      setPreferencesModalOpen(false);
    } catch (err: any) {
      setPreferencesError(err?.message || 'Unable to skip onboarding right now.');
    } finally {
      setPreferencesSaving(false);
    }
  }, [user]);

  const handleClearInterests = React.useCallback(async () => {
    setPreferencesError(null);
    if (!user) {
      setGuestLearningProfile((prev) => ({
        ...prev,
        interests: [],
        goals: '',
        onboardingCompleted: true,
        updatedAt: new Date().toISOString(),
      }));
      setPreferencesModalOpen(false);
      return;
    }

    setPreferencesSaving(true);
    try {
      const res = await apiUpdateLearningProfile({ action: 'clear' });
      setUser(res.user);
      setPreferencesModalOpen(false);
    } catch (err: any) {
      setPreferencesError(err?.message || 'Unable to clear selections right now.');
    } finally {
      setPreferencesSaving(false);
    }
  }, [user]);

  const handleAuthSuccess = (
    authenticatedUser: User,
    initialProgress?: UserProgress,
    userLabNotes?: LabNote[],
    initialLabExploration?: LabExplorationMap,
    initialCapstoneProgress?: CapstoneProgressMap
  ) => {
    setUser(authenticatedUser);

    if (initialProgress) {
      setProgress({
        completedExerciseIds: [],
        completedQuizLessonIds: [],
        completedHomeworkLessonIds: [],
        ...initialProgress,
      });
    } else {
      setProgress({
        completedLessonIds: authenticatedUser.verifiedTopics || [],
        completedExerciseIds: [],
        completedQuizLessonIds: [],
        completedHomeworkLessonIds: [],
        xp: authenticatedUser.xp,
        streak: authenticatedUser.streak,
        lastActiveDate: authenticatedUser.lastActiveDate,
      });
    }

    if (userLabNotes) {
      setLabNotes(userLabNotes);
    }
    setLabExploration(initialLabExploration || {});
    setCapstoneProgress(initialCapstoneProgress || {});

    apiGetUsers().then(setOperatorDirectory);
    apiGetPosts().then(setCommunityPosts);
    apiGetTimeline().then(setTimelineEvents);

    setActiveTab('dashboard');
  };

  return (
    <div
      className={`flex flex-col md:flex-row bg-slate-950 text-slate-100 ${
        activeTab === 'landing'
          ? 'min-h-screen w-full overflow-x-hidden'
          : 'min-h-screen md:h-screen w-full md:overflow-hidden'
      }`}
    >
      {authHydrating && activeTab === 'landing' ? (
        <div className="flex-1 flex items-center justify-center p-8 text-xs font-mono text-slate-400">
          VERIFYING SESSION CLEARANCE...
        </div>
      ) : activeTab === 'landing' ? (
        <LandingPage
          onInitializeSession={() => setAuthModalOpen(true)}
          onExploreTracks={() => setActiveTab('tracks')}
        />
      ) : (
        <>
          <Sidebar
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            user={user}
            progress={progress}
            totalLessons={totalLessons}
            completedLessonsCount={curriculumStats.completedLessons}
            onLogOut={handleLogOut}
            onSignInClick={() => setAuthModalOpen(true)}
            onOpenAiTutor={handleToggleGlobalTutor}
          />

          <main className="flex-1 flex flex-col min-w-0 bg-slate-950 md:overflow-hidden relative">
            {(activeTab === 'dashboard' ||
              activeTab === 'tracks' ||
              activeTab === 'player' ||
              activeTab === 'capstones') &&
            curriculumLoading &&
            curriculum.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 text-sm text-slate-400">
                Loading academy curriculum...
              </div>
            ) : (activeTab === 'dashboard' ||
                activeTab === 'tracks' ||
                activeTab === 'player' ||
                activeTab === 'capstones') &&
              curriculumError &&
              curriculum.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3 text-center">
                <p className="text-sm text-rose-300">{curriculumError}</p>
                <button
                  type="button"
                  onClick={loadCurriculum}
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                {user && activeTab === 'dashboard' && (
                  <Dashboard
                    user={user}
                    progress={progress}
                    curriculum={curriculum}
                    labsByLesson={labsByLesson}
                    capstoneProgress={capstoneProgress}
                    communityPosts={communityPosts}
                    labNotes={labNotes}
                    learningProfile={activeLearningProfile}
                    onOpenPreferencesModal={() => {
                      setPreferencesError(null);
                      setPreferencesModalOpen(true);
                    }}
                    setActiveTab={handleTabChange}
                    setSelectedLessonId={setSelectedLessonId}
                    onSelectTier={(tierId) => {
                      setSelectedTierId(tierId);
                      setTracksViewMode('tiers');
                    }}
                    onSelectStage={(stageId) => {
                      setSelectedStageId(stageId);
                      setTracksViewMode('journey');
                    }}
                    onBrowseClassicTiers={() => {
                      setTracksViewMode('tiers');
                      handleTabChange('tracks');
                    }}
                  />
                )}

                {activeTab === 'tracks' && (
                  <Tracks
                    curriculum={curriculum}
                    labsByLesson={labsByLesson}
                    progress={progress}
                    capstoneProgress={capstoneProgress}
                    learningProfile={activeLearningProfile}
                    onOpenPreferencesModal={() => {
                      setPreferencesError(null);
                      setPreferencesModalOpen(true);
                    }}
                    onSkipOnboarding={handleSkipOnboarding}
                    onClearInterests={handleClearInterests}
                    setActiveTab={handleTabChange}
                    setSelectedLessonId={setSelectedLessonId}
                    user={user}
                    onLoginRequired={() => setAuthModalOpen(true)}
                    selectedTierId={selectedTierId}
                    onSelectTierId={setSelectedTierId}
                    viewMode={tracksViewMode}
                    onChangeViewMode={setTracksViewMode}
                    selectedStageId={selectedStageId}
                    onSelectStageId={setSelectedStageId}
                    onOpenCapstones={() => handleTabChange('capstones')}
                  />
                )}

                {user && activeTab === 'player' && (
                  <LessonPlayer
                    curriculum={curriculum}
                    labsByLesson={labsByLesson}
                    progress={progress}
                    labExploration={labExploration}
                    onUpdateLabExploration={handleUpdateLabExploration}
                    selectedLessonId={selectedLessonId}
                    setSelectedLessonId={setSelectedLessonId}
                    onActiveEngage={triggerActiveEngagement}
                    terminalConfigs={terminalConfigs}
                    saveTerminalConfig={saveTerminalConfig}
                    onBackToTracks={() => handleTabChange('tracks')}
                  />
                )}

                {user && activeTab === 'capstones' && (
                  <Capstones
                    curriculum={curriculum}
                    user={user}
                    progress={progress}
                    capstoneProgress={capstoneProgress}
                    onCapstoneStateUpdate={handleCapstoneStateUpdate}
                    onOpenLesson={(lessonId) => {
                      setSelectedLessonId(lessonId);
                      handleTabChange('player');
                    }}
                  />
                )}
              </>
            )}

            {user && activeTab === 'scratchpad' && (
              <LabScratchpad
                labNotes={labNotes}
                saveLabNote={saveLabNote}
                deleteLabNote={deleteLabNote}
              />
            )}

            {activeTab === 'forum' && (
              <CommunityForum
                posts={communityPosts}
                savePost={savePost}
                updatePostVotes={updatePostVotes}
                user={user}
                directory={operatorDirectory}
                followUser={followUser}
                timelineEvents={timelineEvents}
                curriculum={curriculum}
              />
            )}

            {/* Persistent Floating "AI Tutor" Button on non-player screens */}
            {activeTab !== 'player' && currentLessonInfo.lesson && (
              <div className="fixed bottom-5 right-5 z-40">
                <button
                  id="global-ai-tutor-trigger"
                  type="button"
                  onClick={handleToggleGlobalTutor}
                  className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 rounded-lg border shadow-lg transition-colors whitespace-nowrap ${
                    globalAiTutorOpen
                      ? 'bg-sky-500 border-sky-400 text-slate-950 font-semibold'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-100'
                  }`}
                  aria-label="Toggle CyberFoundations AI Tutor"
                  title={
                    user
                      ? 'Open CyberFoundations AI Tutor (Groq)'
                      : 'Sign in to use CyberFoundations AI Tutor'
                  }
                >
                  <MessageSquare
                    className={`h-4 w-4 ${
                      globalAiTutorOpen ? 'text-slate-950' : 'text-sky-400'
                    }`}
                  />
                  <span className="text-xs font-medium">
                    {globalAiTutorOpen ? 'Close Tutor' : 'AI Tutor'}
                  </span>
                </button>
              </div>
            )}
          </main>
        </>
      )}

      {/* Global AI Tutor Drawer Overlay */}
      {user && globalAiTutorOpen && currentLessonInfo.lesson && (
        <div className="fixed inset-0 z-50 pointer-events-none flex justify-end">
          <div
            onClick={() => setGlobalAiTutorOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm pointer-events-auto sm:hidden"
          />
          <div className="pointer-events-auto h-full w-full sm:w-[460px] md:w-[500px] shadow-2xl bg-slate-950 border-l border-slate-800">
            <AiTutorPanel
              lesson={currentLessonInfo.lesson}
              topicTitle={currentLessonInfo.topicTitle}
              tierNumber={currentLessonInfo.tierNumber}
              activeExercise={currentExercise}
              isOpen={globalAiTutorOpen}
              onClose={() => setGlobalAiTutorOpen(false)}
              onRequireAuth={() => setAuthModalOpen(true)}
              isFloating={false}
            />
          </div>
        </div>
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <LearningPreferencesModal
        isOpen={preferencesModalOpen}
        onClose={() => {
          if (!preferencesSaving) setPreferencesModalOpen(false);
        }}
        currentProfile={activeLearningProfile}
        isAuthenticated={Boolean(user)}
        saving={preferencesSaving}
        error={preferencesError}
        onSave={handleSaveLearningPreferences}
        onSkip={handleSkipOnboarding}
        onClear={handleClearInterests}
      />
    </div>
  );
}


