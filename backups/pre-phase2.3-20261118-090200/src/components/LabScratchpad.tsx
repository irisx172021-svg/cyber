import React, { useState } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  Edit3, 
  Columns, 
  Bold, 
  Italic, 
  Heading1, 
  List, 
  Code, 
  Sparkles,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { LabNote } from '../types';

interface LabScratchpadProps {
  labNotes: LabNote[];
  saveLabNote: (note: LabNote) => void;
  deleteLabNote: (id: string) => void;
}

export default function LabScratchpad({ labNotes, saveLabNote, deleteLabNote }: LabScratchpadProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string>(labNotes[0]?.id || '');
  const [editorMode, setEditorMode] = useState<'edit' | 'preview' | 'split'>('split');
  
  // Find current note
  const currentNote = labNotes.find(note => note.id === selectedNoteId);

  // Buffer state to avoid lagging during typing
  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState('');

  // Sync buffer state when selected note changes
  React.useEffect(() => {
    if (currentNote) {
      setLocalTitle(currentNote.title || '');
      setLocalContent(currentNote.content || '');
      setEditingNoteId(currentNote.id);
    } else {
      setLocalTitle('');
      setLocalContent('');
      setEditingNoteId('');
    }
  }, [selectedNoteId, currentNote]);

  // Handle Note Save
  const handleSave = () => {
    if (!editingNoteId) return;
    const noteToSave: LabNote = {
      id: editingNoteId,
      moduleId: currentNote?.moduleId || 'custom-note',
      moduleTitle: currentNote?.moduleTitle || 'Independent Lab Draft',
      title: localTitle.trim() || 'Untitled Scratchpad',
      content: localContent,
      lastSaved: new Date().toISOString()
    };
    saveLabNote(noteToSave);
  };

  // Create a new independent lab note draft
  const handleCreateNote = () => {
    const newId = `note-${Date.now()}`;
    const newNote: LabNote = {
      id: newId,
      moduleId: 'custom-note',
      moduleTitle: 'Independent Lab Session',
      title: 'New Encrypted Note',
      content: `# New Cyber Lab Notes

## Reconnaissance Summary
Type your lab observations, port scans, and target credentials here.

## Active Command Stack
\`\`\`bash
# Insert your bash configs
\`\`\`
`,
      lastSaved: new Date().toISOString()
    };
    saveLabNote(newNote);
    setSelectedNoteId(newId);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to scrub this encrypted note from secure local storage?')) {
      deleteLabNote(id);
      // Select the first remaining note
      const remaining = labNotes.filter(n => n.id !== id);
      if (remaining.length > 0) {
        setSelectedNoteId(remaining[0].id);
      } else {
        setSelectedNoteId('');
      }
    }
  };

  // Formatting helper
  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('scratchpad-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const replacement = before + selected + after;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    
    setLocalContent(newContent);
    
    // Reset focus and cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 50);
  };

  return (
    <div className="flex-1 flex bg-slate-950 text-slate-100 overflow-hidden h-full">
      
      {/* File management sidebar */}
      <div className="w-72 border-r border-slate-800/80 bg-slate-950 flex flex-col shrink-0 select-none">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/10 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-emerald-500" /> Secure Directory
          </span>
          <button 
            onClick={handleCreateNote}
            className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 text-xs rounded transition-all flex items-center justify-center"
            title="Create Independent Note"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Note selection list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {labNotes.map((note) => {
            const isSelected = note.id === selectedNoteId;
            return (
              <div
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className={`p-3 rounded border text-left cursor-pointer transition-all duration-200 group relative ${
                  isSelected
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.03)]'
                    : 'bg-slate-950 border-slate-900/60 hover:bg-slate-900/30 hover:border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] font-mono mb-1.5">
                  <span className="text-slate-500 uppercase truncate max-w-[130px]">
                    {note.moduleTitle}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(note.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-red-400 transition-opacity"
                    title="Delete Draft"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                
                <h4 className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors truncate">
                  {note.title}
                </h4>

                <p className="text-[10px] font-mono text-slate-500 mt-2">
                  SAVED: {new Date(note.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            );
          })}

          {labNotes.length === 0 && (
            <div className="text-center py-10 text-xs text-slate-500 font-mono">
              Directory empty. Click "+" to spawn a new lab scratchpad.
            </div>
          )}
        </div>
      </div>

      {/* Editor & Preview Pane */}
      {currentNote ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Editor Header Toolbar */}
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/30 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <FileText className="h-4 w-4 text-emerald-500" />
              <input
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                placeholder="Name your lab configuration..."
                className="bg-transparent border-b border-transparent hover:border-slate-800 focus:border-emerald-500 focus:outline-none text-sm font-bold text-slate-100 px-1 py-0.5 w-full sm:w-64 font-sans"
              />
            </div>

            {/* Mode selector */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded text-slate-400">
                <button
                  onClick={() => setEditorMode('edit')}
                  className={`p-1.5 rounded text-xs font-mono flex items-center gap-1 ${
                    editorMode === 'edit' ? 'bg-slate-950 text-emerald-400 font-semibold' : 'hover:text-slate-200'
                  }`}
                  title="Raw Editor"
                >
                  <Edit3 className="h-3.5 w-3.5" /> <span className="hidden md:inline">Editor</span>
                </button>
                <button
                  onClick={() => setEditorMode('preview')}
                  className={`p-1.5 rounded text-xs font-mono flex items-center gap-1 ${
                    editorMode === 'preview' ? 'bg-slate-950 text-emerald-400 font-semibold' : 'hover:text-slate-200'
                  }`}
                  title="Live Preview"
                >
                  <Eye className="h-3.5 w-3.5" /> <span className="hidden md:inline">Preview</span>
                </button>
                <button
                  onClick={() => setEditorMode('split')}
                  className={`p-1.5 rounded text-xs font-mono flex items-center gap-1 ${
                    editorMode === 'split' ? 'bg-slate-950 text-emerald-400 font-semibold' : 'hover:text-slate-200'
                  }`}
                  title="Split View"
                >
                  <Columns className="h-3.5 w-3.5" /> <span className="hidden md:inline">Split</span>
                </button>
              </div>

              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold rounded flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.15)] active:scale-95 transition-all"
              >
                <Save className="h-3.5 w-3.5" /> SECURE WRITE
              </button>
            </div>
          </div>

          {/* Quick Markup Formatting Toolbar */}
          {editorMode !== 'preview' && (
            <div className="px-5 py-2 border-b border-slate-800/60 bg-slate-900/10 flex items-center gap-1.5 shrink-0">
              <button 
                onClick={() => insertText('**', '**')} 
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded transition-colors"
                title="Bold text"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => insertText('*', '*')} 
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded transition-colors"
                title="Italic text"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => insertText('# ', '\n')} 
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded transition-colors"
                title="Header 1"
              >
                <Heading1 className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => insertText('- ', '\n')} 
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded transition-colors"
                title="Bullet list"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => insertText('\n\`\`\`bash\n', '\n\`\`\`\n')} 
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded transition-colors"
                title="Code block"
              >
                <Code className="h-3.5 w-3.5" />
              </button>
              <div className="h-4 w-px bg-slate-800/80 mx-1" />
              <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Draft edits auto-buffered locally.
              </span>
            </div>
          )}

          {/* Workspace Panels */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left side: Text Area Editor */}
            {(editorMode === 'edit' || editorMode === 'split') && (
              <div className="flex-1 flex flex-col bg-slate-950">
                <textarea
                  id="scratchpad-textarea"
                  value={localContent}
                  onChange={(e) => setLocalContent(e.target.value)}
                  placeholder="Draft your lab markdown documentation..."
                  className="flex-1 p-6 bg-slate-950 font-mono text-xs text-slate-300 resize-none outline-none border-none focus:ring-0 leading-relaxed overflow-y-auto"
                />
              </div>
            )}

            {/* Split Divider */}
            {editorMode === 'split' && (
              <div className="w-px bg-slate-800/80 shrink-0" />
            )}

            {/* Right side: Markdown Live Preview */}
            {(editorMode === 'preview' || editorMode === 'split') && (
              <div className="flex-1 p-6 overflow-y-auto bg-slate-950 min-w-0">
                <MarkdownRenderer content={localContent || '_No documentation written yet. Start typing inside editor..._'} />
              </div>
            )}

          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-400 py-16 font-mono select-none">
          <FolderOpen className="h-10 w-10 text-slate-700 mb-4" />
          <p>No active notes found in target directory.</p>
          <button
            onClick={handleCreateNote}
            className="mt-4 px-4 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded hover:bg-emerald-400 transition-all"
          >
            Create Independent Note_
          </button>
        </div>
      )}

    </div>
  );
}
