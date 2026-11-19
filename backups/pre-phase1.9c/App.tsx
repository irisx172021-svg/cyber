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
import { MessageSquare } from 'lucide-react';

import { LEGACY_LESSON_ID_MAP, resolveCanonicalLessonId } from './data/curriculumMetadata';
import { computeCurriculumStats } from './lib/curriculumProgress';
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
  LabNote,
  CommunityPost,
  TimelineEvent,
  EngageSubmissionPayload,
  Tier,
  PracticalLab,
  EngageApiResponse,
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
  getStoredAuthToken,
} from './lib/api';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const token = getStoredAuthToken();
    const cached = localStorage.getItem('cfa_user');
    if (!token || !cached) {
      localStorage.removeItem('cfa_user');
      localStorage.removeItem('cfa_user_id');
      return null;
    }
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    const token = getStoredAuthToken();
    const cachedUser = localStorage.getItem('cfa_user');
    return token && cachedUser ? 'dashboard' : 'landing';
  });

  const [selectedLessonId, setSelectedLessonIdState] = useState<string>('comp-hardware');
  const [selectedTierId, setSelectedTierId] = useState<string>('tier-1');

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
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

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

  useEffect(() => {
    if (user) {
      localStorage.setItem('cfa_user', JSON.stringify(user));
      localStorage.setItem('cfa_user_id', user.id);
    } else {
      localStorage.removeItem('cfa_user');
      localStorage.removeItem('cfa_user_id');
    }
  }, [user]);

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
    apiLogout().catch(() => {});
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
    setActiveTab('landing');
  };

  const handleAuthSuccess = (
    authenticatedUser: User,
    initialProgress?: UserProgress,
    userLabNotes?: LabNote[]
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
      {activeTab === 'landing' ? (
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
            {(activeTab === 'dashboard' || activeTab === 'tracks' || activeTab === 'player') &&
            curriculumLoading &&
            curriculum.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 text-sm text-slate-400">
                Loading academy curriculum...
              </div>
            ) : (activeTab === 'dashboard' || activeTab === 'tracks' || activeTab === 'player') &&
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
                    communityPosts={communityPosts}
                    labNotes={labNotes}
                    setActiveTab={handleTabChange}
                    setSelectedLessonId={setSelectedLessonId}
                    onSelectTier={(tierId) => setSelectedTierId(tierId)}
                  />
                )}

                {activeTab === 'tracks' && (
                  <Tracks
                    curriculum={curriculum}
                    labsByLesson={labsByLesson}
                    progress={progress}
                    setActiveTab={handleTabChange}
                    setSelectedLessonId={setSelectedLessonId}
                    user={user}
                    onLoginRequired={() => setAuthModalOpen(true)}
                    selectedTierId={selectedTierId}
                    onSelectTierId={setSelectedTierId}
                  />
                )}

                {user && activeTab === 'player' && (
                  <LessonPlayer
                    curriculum={curriculum}
                    labsByLesson={labsByLesson}
                    progress={progress}
                    selectedLessonId={selectedLessonId}
                    setSelectedLessonId={setSelectedLessonId}
                    onActiveEngage={triggerActiveEngagement}
                    terminalConfigs={terminalConfigs}
                    saveTerminalConfig={saveTerminalConfig}
                    onBackToTracks={() => handleTabChange('tracks')}
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
    </div>
  );
}


