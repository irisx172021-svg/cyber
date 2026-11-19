import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Send, 
  Search, 
  Tag, 
  User as UserIcon, 
  PlusCircle, 
  X,
  Sparkles,
  ShieldAlert,
  Flame,
  Award,
  UserCheck,
  UserPlus,
  Activity,
  CheckCircle,
  Database,
  Wifi,
  Users,
  MessageCircle,
  Check,
  Lock,
  Unlock,
  RefreshCw,
  Plus
} from 'lucide-react';
import { CommunityPost, User, PublicDirectoryUser, TimelineEvent, Group } from '../types';
import {
  apiGetGroups,
  apiCreateGroup,
  apiAddGroupMember,
  apiSendGroupMessage,
} from '../lib/api';
import { ACADEMY_CURRICULUM } from '../data/curriculum';
import { resolveCanonicalLessonId } from '../data/curriculumMetadata';
import { indexCurriculumLessons } from '../lib/curriculumProgress';

const LESSON_TITLE_INDEX = indexCurriculumLessons(ACADEMY_CURRICULUM);

interface CommunityForumProps {
  posts: CommunityPost[];
  savePost: (post: CommunityPost) => void;
  updatePostVotes: (postId: string, voteType: 'up' | 'down' | null) => void;
  user: User | null;
  directory: PublicDirectoryUser[];
  followUser: (username: string) => void;
  timelineEvents: TimelineEvent[];
}

export default function CommunityForum({ 
  posts, 
  savePost, 
  updatePostVotes, 
  user, 
  directory, 
  followUser, 
  timelineEvents 
}: CommunityForumProps) {
  // Current active view tab inside Community (Digests, Directory, Timeline, Groups)
  const [subTab, setSubTab] = useState<'posts' | 'directory' | 'timeline' | 'groups'>('posts');
  
  // States for Posts Filtering & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // States for Directory Search
  const [dirSearchQuery, setDirSearchQuery] = useState<string>('');

  // Groups Subsystem local states
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [groupsLoading, setGroupsLoading] = useState<boolean>(false);
  const [groupMessageText, setGroupMessageText] = useState<string>('');
  const [recruitUsername, setRecruitUsername] = useState<string>('');
  const [isCreatingGroup, setIsCreatingGroup] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupDescription, setNewGroupDescription] = useState<string>('');
  
  const [recruitError, setRecruitError] = useState<string | null>(null);
  const [recruitSuccess, setRecruitSuccess] = useState<string | null>(null);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of active group chats
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeGroup?.messages]);

  // Load and poll groups list and active group messages
  const loadGroups = async (showLoading = false) => {
    if (showLoading) setGroupsLoading(true);
    try {
      const data = await apiGetGroups();
      setGroups(data);
      if (activeGroup) {
        const freshActive = data.find(g => g.id === activeGroup.id);
        if (freshActive) {
          setActiveGroup(freshActive);
        }
      }
    } catch (err) {
      console.error('Failed to sync groups:', err);
    } finally {
      if (showLoading) setGroupsLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'groups') {
      loadGroups(true);
    }
  }, [subTab]);

  // Polling loop for active group chat
  useEffect(() => {
    if (subTab !== 'groups') return;
    const interval = setInterval(() => {
      loadGroups(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [subTab, activeGroup?.id]);

  // New post form state
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [newCategory, setNewCategory] = useState<'General' | 'Help' | 'Defensive' | 'Offensive' | 'Certifications'>('General');
  const [newAuthorRole, setNewAuthorRole] = useState<'Cadet' | 'Operator' | 'Infiltrator' | 'Instructor'>('Cadet');

  const categories = ['All', 'General', 'Help', 'Defensive', 'Offensive', 'Certifications'];

  // Handle post submit
  const handleSubmitPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      title: newTitle.trim(),
      author: user ? user.username.replace('@', '') : 'Anonymous_Cadet',
      authorRole: user ? (user.rank as any).split(' ')[1] || 'Cadet' : 'Cadet',
      content: newContent.trim(),
      category: newCategory,
      upvotes: 1, // Starts with 1 self-upvote
      userVote: 'up',
      createdAt: new Date().toISOString(),
      commentsCount: 0
    };

    savePost(newPost);
    
    // Clear state & close deck
    setNewTitle('');
    setNewContent('');
    setNewCategory('General');
    setNewAuthorRole('Cadet');
    setIsPosting(false);
  };

  // Upvote/downvote click tracking logic
  const handleVoteClick = (postId: string, currentVote: 'up' | 'down' | null, direction: 'up' | 'down') => {
    if (!user) return; // Protected action
    if (currentVote === direction) {
      updatePostVotes(postId, null);
    } else {
      updatePostVotes(postId, direction);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newGroupName.trim() || !newGroupDescription.trim()) {
      setCreateGroupError('Group name and description are required.');
      return;
    }
    setCreateGroupError(null);
    try {
      const created = await apiCreateGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
      });
      setNewGroupName('');
      setNewGroupDescription('');
      setIsCreatingGroup(false);
      // Automatically reload groups and set active
      const refreshed = await apiGetGroups();
      setGroups(refreshed);
      const matched = refreshed.find(g => g.id === created.id);
      if (matched) {
        setActiveGroup(matched);
      }
    } catch (err: any) {
      setCreateGroupError(err.message || 'Failed to construct team group');
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;
    try {
      const updated = await apiAddGroupMember(groupId, user.username);
      // Reload groups list
      await loadGroups(false);
      // Refresh active group state
      if (activeGroup?.id === groupId) {
        setActiveGroup(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to connect to team frequency');
    }
  };

  const handleRecruitMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeGroup || !recruitUsername.trim()) return;
    setRecruitError(null);
    setRecruitSuccess(null);
    try {
      const cleanUsername = recruitUsername.trim();
      const updated = await apiAddGroupMember(activeGroup.id, cleanUsername);
      setRecruitUsername('');
      setRecruitSuccess(`Operator "${cleanUsername}" successfully clearance-registered inside channel!`);
      // Update local state
      setActiveGroup(updated);
      await loadGroups(false);
    } catch (err: any) {
      setRecruitError(err.message || 'Verification mismatch: Operator identity invalid.');
    }
  };

  const handleSendGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeGroup || !groupMessageText.trim()) return;
    try {
      const msgText = groupMessageText.trim();
      setGroupMessageText('');
      await apiSendGroupMessage(activeGroup.id, msgText);
      // Instantly load groups to display sent message
      await loadGroups(false);
    } catch (err: any) {
      alert(err.message || 'Package dispatch failed');
    }
  };

  // Filter posts based on category & search terms
  const filteredPosts = posts.filter((post) => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filter directory users based on handle/username
  const filteredDirectory = directory.filter((op) => {
    // Standardizing search query prefix
    const query = dirSearchQuery.toLowerCase().trim();
    const handle = op.username.toLowerCase();
    const cleanHandle = handle.replace('@', '');
    return handle.includes(query) || cleanHandle.includes(query) || op.rank.toLowerCase().includes(query);
  });

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-slate-950 text-slate-100 overflow-hidden h-full">
      
      {/* Sidebar: Categories, Quick Stats & Live Signal Feed */}
      <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-slate-950 flex flex-col shrink-0 p-5 select-none space-y-6 overflow-y-auto">
        
        {/* Sub-Navigation Tab Controller */}
        <div className="space-y-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => { setSubTab('posts'); setIsPosting(false); }}
            className={`w-full py-1.5 px-3 rounded text-xs font-mono text-left flex items-center justify-between transition-colors ${
              subTab === 'posts' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>INTELLIGENCE FEEDS</span>
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setSubTab('directory'); setIsPosting(false); }}
            className={`w-full py-1.5 px-3 rounded text-xs font-mono text-left flex items-center justify-between transition-colors ${
              subTab === 'directory' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>OPERATOR DIRECTORY</span>
            <UserIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setSubTab('timeline'); setIsPosting(false); }}
            className={`w-full py-1.5 px-3 rounded text-xs font-mono text-left flex items-center justify-between transition-colors ${
              subTab === 'timeline' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>SIGNAL TIMELINE</span>
            <Activity className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setSubTab('groups'); setIsPosting(false); }}
            className={`w-full py-1.5 px-3 rounded text-xs font-mono text-left flex items-center justify-between transition-colors ${
              subTab === 'groups' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>COMMUNITY GROUPS</span>
            <Users className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Dynamic Category/Context Sidebar Filters depending on subTab */}
        {subTab === 'posts' && (
          <>
            {/* Search Posts bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Intelligence feed..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-blue-500/50 focus:outline-none rounded text-xs font-mono text-slate-300"
              />
            </div>

            {/* Categorization filters */}
            <div className="space-y-2">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none mb-3">Classification Channels</p>
              <div className="flex flex-wrap lg:flex-col gap-1.5">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  const count = cat === 'All' 
                    ? posts.length 
                    : posts.filter(p => p.category === cat).length;

                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-2 rounded text-xs text-left font-mono transition-all duration-150 flex items-center justify-between ${
                        isSelected 
                          ? 'bg-blue-950/40 border border-blue-500/30 text-blue-300' 
                          : 'bg-slate-900/10 border border-transparent hover:border-slate-800 hover:bg-slate-900/40 text-slate-400'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Tag className="h-3 w-3" /> {cat}
                      </span>
                      <span className="text-[10px] bg-slate-950 border border-slate-800/80 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Button: Open Posting Deck (Locked if Guest) */}
            {user && !isPosting && (
              <button
                onClick={() => setIsPosting(true)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all active:scale-95"
              >
                <PlusCircle className="h-4 w-4" /> BROADCAST INTEL
              </button>
            )}
          </>
        )}

        {subTab === 'directory' && (
          <div className="space-y-4">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">Filters & Queries</p>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={dirSearchQuery}
                onChange={(e) => setDirSearchQuery(e.target.value)}
                placeholder="Query operators (@handle)..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-blue-500/50 focus:outline-none rounded text-xs font-mono text-slate-300"
              />
            </div>
            <div className="p-3.5 bg-slate-900/40 border border-slate-800 rounded-lg space-y-2">
              <p className="text-[9px] font-mono text-slate-400 flex items-center gap-1.5">
                <Wifi className="h-3 w-3 text-emerald-400" /> ACTIVE CLEARANCE LIST
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                Type an operator's unique <span className="text-blue-400 font-mono">@handle</span> to access their cryptographic credentials, streak loops, and certifications.
              </p>
            </div>
          </div>
        )}

        {subTab === 'timeline' && (
          <div className="space-y-4">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">Telemetry Streams</p>
            <div className="p-3.5 bg-slate-900/40 border border-slate-800 rounded-lg space-y-2 font-mono text-[10px] text-slate-400 leading-normal">
              <p className="text-slate-300 font-bold flex items-center gap-1"><Database className="h-3 w-3 text-blue-400" /> DB TELEMETRY</p>
              <p>Type: Shared Ledger Feed</p>
              <p>Events captured: {timelineEvents.length}</p>
              <p>Latency: ~0.002s</p>
            </div>
          </div>
        )}

        {subTab === 'groups' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none">OPERATIONAL GROUPS</p>
              <button
                onClick={() => {
                  setIsCreatingGroup(true);
                  setActiveGroup(null);
                  setCreateGroupError(null);
                }}
                className="p-1 text-blue-400 hover:text-white hover:bg-slate-900 rounded border border-blue-500/10"
                title="Create Group"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* Quick group switcher */}
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {groups.map((g) => {
                const isActive = activeGroup?.id === g.id;
                const isMember = user ? g.members.includes(user.username) : false;

                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setActiveGroup(g);
                      setIsCreatingGroup(false);
                      setRecruitError(null);
                      setRecruitSuccess(null);
                    }}
                    className={`w-full p-2.5 rounded text-xs font-mono text-left border transition-all flex flex-col gap-1 ${
                      isActive
                        ? 'bg-blue-950/40 border-blue-500 text-blue-300'
                        : 'bg-slate-900/20 border-slate-850 hover:bg-slate-900/40 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold truncate">{g.name}</span>
                      {isMember ? (
                        <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded uppercase font-bold">
                          Joined
                        </span>
                      ) : (
                        <span className="text-[8px] bg-slate-950 border border-slate-800 text-slate-500 px-1 py-0.2 rounded uppercase">
                          Public
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-500 line-clamp-1">{g.description}</span>
                  </button>
                );
              })}
              {groups.length === 0 && (
                <p className="text-[9px] text-slate-600 italic">No squads discovered.</p>
              )}
            </div>

            {activeGroup && (
              <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg space-y-2.5">
                <p className="text-[9px] font-mono text-slate-400 flex items-center gap-1.5 uppercase font-bold">
                  <UserPlus className="h-3.5 w-3.5 text-blue-400" /> RECRUIT OPERATOR
                </p>
                
                <form onSubmit={handleRecruitMember} className="space-y-2">
                  <input
                    type="text"
                    value={recruitUsername}
                    onChange={(e) => setRecruitUsername(e.target.value)}
                    placeholder="Enter target username..."
                    className="w-full px-2 py-1 bg-slate-950 border border-slate-850 focus:border-blue-500/50 rounded text-[11px] font-mono text-slate-300 outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[10px] font-bold rounded"
                  >
                    SEND RECRUIT CLEARANCE
                  </button>
                </form>

                {recruitError && (
                  <p className="text-[9px] font-mono text-red-400 leading-normal">{recruitError}</p>
                )}
                {recruitSuccess && (
                  <p className="text-[9px] font-mono text-emerald-400 leading-normal">{recruitSuccess}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Live Signal Feed Widget (Aggregates recent broadcasts) */}
        <div className="pt-4 border-t border-slate-850 space-y-3 shrink-0">
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1.5 leading-none">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            LIVE BROADCAST UPDATE
          </p>
          <div className="space-y-2 text-[10px] font-mono text-slate-400 bg-slate-950">
            {timelineEvents.slice(0, 3).map(ev => (
              <div key={ev.id} className="p-2 border border-slate-900 bg-slate-900/10 rounded flex flex-col gap-0.5">
                <span className="text-blue-400 font-bold">{ev.username}</span>
                <span className="text-[9px] text-slate-300 leading-snug">{ev.action}</span>
                <span className="text-[8px] text-slate-500 text-right">+{ev.xpReward} XP</span>
              </div>
            ))}
            {timelineEvents.length === 0 && (
              <p className="text-[9px] text-slate-600 italic">Listening to frequency channels...</p>
            )}
          </div>
        </div>

      </div>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Posting Form Modal Overlay / Form (Posts Tab Only) */}
        {subTab === 'posts' && isPosting && user && (
          <div className="p-6 bg-slate-900/60 border-b border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-blue-400 animate-pulse" /> Initialize Secured Intel Transmission
              </span>
              <button 
                onClick={() => setIsPosting(false)}
                className="p-1 rounded text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPost} className="space-y-4 font-mono text-xs text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Categorization */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 text-[10px] uppercase">Channel Classification</label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-2 rounded focus:border-blue-500/50 outline-none text-slate-200"
                  >
                    <option value="General">General Channels</option>
                    <option value="Help">Academic Help</option>
                    <option value="Defensive">Defensive Tactics</option>
                    <option value="Offensive">Offensive Tools</option>
                    <option value="Certifications">Certifications & GRC</option>
                  </select>
                </div>

                {/* Cyber Classification Tags */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 text-[10px] uppercase">Operator Clearance Class</label>
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded text-slate-300">
                    {user.rank}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-slate-400 text-[10px] uppercase">Subject Heading</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Windows Defender signatures bypass vector..."
                  className="w-full bg-slate-950 border border-slate-800 p-2 rounded focus:border-blue-500/50 outline-none text-slate-200 font-sans text-xs font-semibold"
                />
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <label className="text-slate-400 text-[10px] uppercase">Transmission Payload Content</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Insert terminal instructions, exploit structures, or defense logs here..."
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded focus:border-blue-500/50 outline-none text-slate-300 font-sans text-xs leading-relaxed"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPosting(false)}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded text-slate-400 text-xs font-mono transition-colors"
                >
                  CANCEL TRANSMISSION
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-mono text-xs font-bold rounded flex items-center gap-1.5 shadow-[0_0_12px_rgba(59,130,246,0.15)] active:scale-95 transition-all"
                >
                  <Send className="h-3.5 w-3.5" /> EMIT TELEMETRY
                </button>
              </div>
            </form>
          </div>
        )}

        {/* View Stream Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* SubTab Header Info Bar */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4 shrink-0 font-mono">
            <h3 className="text-xs uppercase tracking-wider text-slate-500">
              {subTab === 'posts' && `Showing ${filteredPosts.length} secured intelligence digests`}
              {subTab === 'directory' && `Showing ${filteredDirectory.length} active operator nodes`}
              {subTab === 'timeline' && `Showing ${timelineEvents.length} global network activity alerts`}
              {subTab === 'groups' && `Active Tactical Group Chat & Squad Operations`}
            </h3>
            <span className="text-[10px] text-slate-600 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              SECURE CONNECT (SHA256)
            </span>
          </div>

          {/* RENDERING SUBTAB: POSTS */}
          {subTab === 'posts' && (
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const upvoted = post.userVote === 'up';
                const downvoted = post.userVote === 'down';

                // Custom color tag for user class
                let roleStyle = 'bg-slate-900 text-slate-400 border-slate-800';
                if (post.authorRole === 'Infiltrator') {
                  roleStyle = 'bg-red-500/10 text-red-400 border-red-500/20';
                } else if (post.authorRole === 'Instructor') {
                  roleStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                } else if (post.authorRole === 'Operator') {
                  roleStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                }

                // Category styles
                let catStyle = 'bg-slate-900/50 border-slate-800 text-slate-400';
                if (post.category === 'Offensive') {
                  catStyle = 'bg-red-500/5 border-red-500/15 text-red-400/85';
                } else if (post.category === 'Defensive') {
                  catStyle = 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400/85';
                } else if (post.category === 'Certifications') {
                  catStyle = 'bg-amber-500/5 border-amber-500/15 text-amber-400/85';
                } else if (post.category === 'Help') {
                  catStyle = 'bg-teal-500/5 border-teal-500/15 text-teal-400/85';
                }

                return (
                  <div 
                    key={post.id}
                    className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-lg space-y-4 hover:border-slate-700/80 transition-all duration-150"
                  >
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono border ${catStyle}`}>
                            {post.category}
                          </span>
                          <span className="text-slate-600 text-xs font-mono">•</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-200 font-sans tracking-tight pt-1">
                          {post.title}
                        </h4>
                      </div>

                      {/* Profile capsule */}
                      <div className="flex items-center gap-2 shrink-0 select-none">
                        <div className="text-right">
                          <p className="text-xs font-semibold text-slate-300 font-mono">
                            {post.author.startsWith('@') ? post.author : `@${post.author}`}
                          </p>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono border font-medium ${roleStyle}`}>
                            {post.authorRole}
                          </span>
                        </div>
                        <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xs">
                          <UserIcon className="h-4 w-4" />
                        </div>
                      </div>
                    </div>

                    {/* Content body */}
                    <p className="text-xs text-slate-400 leading-relaxed font-sans whitespace-pre-wrap">
                      {post.content}
                    </p>

                    {/* Footer upvote panel */}
                    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono select-none">
                      
                      {/* Upvote/Downvote actions */}
                      <div className="flex items-center gap-1.5">
                        
                        {/* Upvote */}
                        <button
                          disabled={!user}
                          onClick={() => handleVoteClick(post.id, post.userVote, 'up')}
                          className={`p-1.5 rounded border flex items-center gap-1.5 transition-all ${
                            upvoted 
                              ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-bold' 
                              : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
                          }`}
                          title={user ? "Upvote Transmission" : "Login Required to Vote"}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>

                        {/* Upvotes Counter */}
                        <span className={`px-2 py-0.5 rounded border border-slate-900 text-xs font-bold font-mono ${
                          post.upvotes > 30 ? 'text-blue-400' : 'text-slate-400'
                        }`}>
                          {post.upvotes}
                        </span>

                        {/* Downvote */}
                        <button
                          disabled={!user}
                          onClick={() => handleVoteClick(post.id, post.userVote, 'down')}
                          className={`p-1.5 rounded border flex items-center gap-1.5 transition-all ${
                            downvoted 
                              ? 'bg-red-500/10 border-red-500 text-red-400 font-bold' 
                              : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
                          }`}
                          title={user ? "Flag/Downvote Payload" : "Login Required to Vote"}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Comments counter */}
                      <div className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{post.commentsCount} replies_</span>
                      </div>

                    </div>
                  </div>
                );
              })}

              {filteredPosts.length === 0 && (
                <div className="text-center py-16 text-xs text-slate-500 font-mono">
                  No matching intelligence signals identified in current frequency.
                </div>
              )}
            </div>
          )}

          {/* RENDERING SUBTAB: DIRECTORY (Operator Search & Follows) */}
          {subTab === 'directory' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDirectory.map((op) => {
                const isSelf = !!user && op.username.toLowerCase() === user.username.toLowerCase();
                const isFollowing = !!user && user.following.includes(op.username);

                return (
                  <div 
                    key={op.username}
                    className="p-5 bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 rounded-xl relative overflow-hidden flex flex-col justify-between gap-4"
                  >
                    <div>
                      {/* Name Card Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs">
                            <UserIcon className="h-4.5 w-4.5 text-blue-400" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1">
                              {op.username}
                              {isSelf && <span className="text-[8px] bg-blue-950/80 border border-blue-500/20 text-blue-400 px-1 rounded">YOU</span>}
                            </h4>
                            <p className="text-[9px] font-mono text-slate-500 mt-0.5">{op.rank}</p>
                          </div>
                        </div>

                        {/* Follow system interaction button */}
                        {!isSelf && user ? (
                          <button
                            onClick={() => followUser(op.username)}
                            className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 border transition-all ${
                              isFollowing
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-500'
                            }`}
                          >
                            {isFollowing ? (
                              <>
                                <UserCheck className="h-3 w-3" />
                                <span>FOLLOWING</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-3 w-3" />
                                <span>FOLLOW</span>
                              </>
                            )}
                          </button>
                        ) : !isSelf && !user ? (
                          <span className="text-[9px] font-mono text-slate-600 border border-slate-900 px-1.5 py-0.5 rounded">
                            SECURE LOCK
                          </span>
                        ) : null}
                      </div>

                      {/* Stat Grid */}
                      <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-slate-850 text-center select-none font-mono text-xs">
                        <div className="p-1 bg-slate-950/40 border border-slate-900 rounded">
                          <span className="block text-[9px] text-slate-500 uppercase">Streak</span>
                          <span className="font-bold text-amber-500 flex items-center justify-center gap-0.5 mt-0.5">
                            <Flame className="h-3 w-3 fill-amber-500/20" /> {op.streak}d
                          </span>
                        </div>
                        <div className="p-1 bg-slate-950/40 border border-slate-900 rounded">
                          <span className="block text-[9px] text-slate-500 uppercase">Core XP</span>
                          <span className="font-bold text-blue-400 mt-0.5 block">
                            {op.xp}
                          </span>
                        </div>
                        <div className="p-1 bg-slate-950/40 border border-slate-900 rounded">
                          <span className="block text-[9px] text-slate-500 uppercase">Followers</span>
                          <span className="font-bold text-indigo-400 mt-0.5 block">
                            {op.followers ? op.followers.length : 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Certified Topics Tags */}
                    {op.verifiedTopics.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[8px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">Cleared Modules</p>
                        <div className="flex flex-wrap gap-1">
                          {op.verifiedTopics.map((topicId) => {
                            const canonicalId = resolveCanonicalLessonId(topicId);
                            const resolvedTitle =
                              LESSON_TITLE_INDEX.get(canonicalId)?.lesson.title ||
                              topicId.replace(/-/g, ' ');
                            return (
                              <span
                                key={topicId}
                                title={resolvedTitle}
                                className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-950 text-slate-300 border border-slate-800 truncate max-w-[190px]"
                              >
                                {resolvedTitle}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredDirectory.length === 0 && (
                <div className="col-span-full text-center py-16 text-xs text-slate-500 font-mono">
                  No matching operator nodes found with clearance level: "{dirSearchQuery}"
                </div>
              )}
            </div>
          )}

          {/* RENDERING SUBTAB: TIMELINE */}
          {subTab === 'timeline' && (
            <div className="space-y-3 max-w-2xl">
              {timelineEvents.map((ev, evIdx) => (
                <div 
                  key={ev.id}
                  className="p-4 bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-lg flex items-start gap-3.5 transition-colors font-mono"
                >
                  <div className="h-7 w-7 rounded bg-blue-950/50 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 text-xs">
                    <Activity className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-slate-300">
                      <span className="text-blue-400 font-bold">@{ev.username}</span> {ev.action}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <Sparkles className="h-3 w-3" /> +{ev.xpReward} XP Reward Verified
                      </span>
                      <span>•</span>
                      <span>{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}

              {timelineEvents.length === 0 && (
                <div className="text-center py-16 text-xs text-slate-500 font-mono">
                  Timeline ledger is currently unpopulated. Complete academic modules to emit telemetry broadcasts!
                </div>
              )}
            </div>
          )}

          {/* RENDERING SUBTAB: GROUPS & CHAT */}
          {subTab === 'groups' && (
            <div className="space-y-4 flex flex-col h-full overflow-hidden">
              {isCreatingGroup ? (
                /* CREATE GROUP FORM SCREEN */
                <div className="max-w-md mx-auto w-full p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 font-mono text-xs text-slate-300">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Users className="h-5 w-5 text-blue-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white font-sans">CONSTRUCT COMMUNITY SQUAD</h4>
                      <p className="text-[10px] text-slate-500">Set up a joint-operation frequency channel</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-400 text-[10px] uppercase">Group Name</label>
                      <input
                        type="text"
                        required
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="e.g., Red Team Infiltrators"
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded focus:border-blue-500/50 outline-none text-slate-100 font-sans text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 text-[10px] uppercase">Operation Description</label>
                      <textarea
                        required
                        rows={3}
                        value={newGroupDescription}
                        onChange={(e) => setNewGroupDescription(e.target.value)}
                        placeholder="Detail the squad objective or certification study channel..."
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded focus:border-blue-500/50 outline-none text-slate-300 font-sans text-xs leading-normal"
                      />
                    </div>

                    {createGroupError && (
                      <p className="text-[10px] text-red-400 font-mono leading-normal">{createGroupError}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsCreatingGroup(false)}
                        className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 rounded text-slate-400"
                      >
                        CANCEL
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded flex items-center gap-1.5"
                      >
                        CONSTRUCT SQUAD
                      </button>
                    </div>
                  </form>
                </div>
              ) : !activeGroup ? (
                /* LIST OF GROUPS SQUAD DIRECTORY */
                <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-280px)] pr-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">Active Joint Channels</p>
                    <button
                      onClick={() => {
                        setIsCreatingGroup(true);
                        setCreateGroupError(null);
                      }}
                      className="px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600 hover:text-white font-mono text-[10px] font-bold rounded flex items-center gap-1 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" /> CREATE NEW SQUAD
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map((g) => {
                      const isMember = user ? g.members.includes(user.username) : false;

                      return (
                        <div
                          key={g.id}
                          className="p-5 bg-slate-900/40 border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-bold text-white font-mono">{g.name}</h4>
                              <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                                {g.members.length} MEMBERS
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{g.description}</p>
                          </div>

                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-1 max-h-[48px] overflow-hidden">
                              {g.members.map((member) => (
                                <span
                                  key={member}
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono border ${
                                    user && member === user.username
                                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                      : 'bg-slate-950 border-slate-900 text-slate-500'
                                  }`}
                                >
                                  {member}
                                </span>
                              ))}
                            </div>

                            <button
                              onClick={() => {
                                if (isMember) {
                                  setActiveGroup(g);
                                } else {
                                  handleJoinGroup(g.id);
                                }
                              }}
                              className={`w-full py-2 font-mono text-[10px] font-bold rounded transition-all flex items-center justify-center gap-1.5 border ${
                                isMember
                                  ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-500'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900/60'
                              }`}
                            >
                              {isMember ? (
                                <>
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  <span>OPEN CHATROOM FREQUENCY</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-3.5 w-3.5 text-blue-400" />
                                  <span>JOIN GROUP CHANNEL</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {groups.length === 0 && (
                      <div className="col-span-full text-center py-16 text-xs text-slate-500 font-mono">
                        No team squads identified. Construct a new operational squad block above!
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* LIVE GROUP CHATROOM WINDOW */
                <div className="flex-1 flex flex-col bg-slate-900/20 border border-slate-850 rounded-xl overflow-hidden h-[calc(100vh-280px)] min-h-[350px]">
                  {/* Chatroom header panel */}
                  <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="p-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded shrink-0">
                          <Users className="h-4 w-4" />
                        </span>
                        <h4 className="text-xs font-bold text-white font-mono">{activeGroup.name}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal line-clamp-1">{activeGroup.description}</p>
                    </div>

                    <button
                      onClick={() => setActiveGroup(null)}
                      className="px-2 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-[10px] font-mono rounded"
                    >
                      EXIT ROOM
                    </button>
                  </div>

                  {/* Message Stack Panel */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
                    {activeGroup.messages.map((m) => {
                      const isSelf = user && m.senderUsername === user.username;

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col max-w-[80%] space-y-1 ${
                            isSelf ? 'ml-auto items-end' : 'mr-auto items-start'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500">
                            <span className="font-bold text-blue-400">{m.senderUsername}</span>
                            <span>•</span>
                            <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div
                            className={`p-3 rounded-lg text-xs leading-relaxed font-sans ${
                              isSelf
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-slate-900 text-slate-300 border border-slate-800 rounded-tl-none'
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                      );
                    })}

                    {activeGroup.messages.length === 0 && (
                      <div className="text-center py-16 text-xs text-slate-600 font-mono italic">
                        No telemetry messages received on this group feed. Emit the first packet block!
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input sending terminal bottom form */}
                  <div className="p-3 bg-slate-900/80 border-t border-slate-800 shrink-0 font-sans">
                    {user && activeGroup.members.includes(user.username) ? (
                      <form onSubmit={handleSendGroupMessage} className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={groupMessageText}
                          onChange={(e) => setGroupMessageText(e.target.value)}
                          placeholder={`Dispatch message packet inside ${activeGroup.name}...`}
                          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded text-xs text-slate-100"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(59,130,246,0.15)] shrink-0"
                        >
                          <Send className="h-3.5 w-3.5" /> DISPATCH
                        </button>
                      </form>
                    ) : (
                      <div className="text-center p-2 bg-slate-950 border border-slate-850 rounded flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
                        <span className="text-red-400 font-bold flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5" /> SECURED CO-OP FREQUENCY BARRIER
                        </span>
                        <button
                          onClick={() => handleJoinGroup(activeGroup.id)}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[10px]"
                        >
                          JOIN FREQUENCY
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
