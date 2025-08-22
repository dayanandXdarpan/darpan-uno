import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  type: 'file_change' | 'circuit_change' | 'project_action' | 'build' | 'upload';
  description: string;
  data: any;
  projectPath: string;
  userId?: string;
  reversible: boolean;
  undoData?: any;
}

export interface ProjectSnapshot {
  id: string;
  timestamp: Date;
  name: string;
  description: string;
  files: Map<string, string>; // filepath -> content
  circuit?: any;
  settings: Record<string, any>;
  tags: string[];
}

export interface CollaborationSession {
  id: string;
  projectId: string;
  participants: Participant[];
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
  permissions: SessionPermissions;
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
  role: 'owner' | 'editor' | 'viewer';
  isOnline: boolean;
  lastSeen: Date;
  cursor?: { file: string; line: number; column: number };
  color: string;
}

export interface SessionPermissions {
  canEdit: boolean;
  canBuild: boolean;
  canUpload: boolean;
  canInvite: boolean;
  canManageSettings: boolean;
}

export interface ChangeEvent {
  id: string;
  timestamp: Date;
  type: 'insert' | 'delete' | 'replace';
  file: string;
  range: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  content: string;
  userId: string;
  applied: boolean;
}

export class HistoryManager extends EventEmitter {
  private history: HistoryEntry[] = [];
  private snapshots: Map<string, ProjectSnapshot> = new Map();
  private collaborationSessions: Map<string, CollaborationSession> = new Map();
  private activeChanges: Map<string, ChangeEvent[]> = new Map(); // file -> changes
  private projectPath: string;
  private maxHistoryEntries: number = 1000;
  private autoSnapshotInterval: number = 5 * 60 * 1000; // 5 minutes
  private snapshotTimer?: NodeJS.Timeout;

  constructor(projectPath: string) {
    super();
    this.projectPath = projectPath;
    this.loadHistory();
    this.startAutoSnapshot();
  }

  // History Management
  async addHistoryEntry(
    type: HistoryEntry['type'],
    description: string,
    data: any,
    reversible: boolean = false,
    undoData?: any
  ): Promise<string> {
    const entry: HistoryEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      description,
      data,
      projectPath: this.projectPath,
      reversible,
      undoData
    };

    this.history.unshift(entry); // Add to beginning for recent-first ordering

    // Limit history size
    if (this.history.length > this.maxHistoryEntries) {
      this.history = this.history.slice(0, this.maxHistoryEntries);
    }

    await this.saveHistory();
    this.emit('history-added', entry);
    
    return entry.id;
  }

  async getHistory(limit: number = 50, type?: HistoryEntry['type']): Promise<HistoryEntry[]> {
    let filteredHistory = this.history;
    
    if (type) {
      filteredHistory = this.history.filter(entry => entry.type === type);
    }
    
    return filteredHistory.slice(0, limit);
  }

  async undoAction(historyId: string): Promise<boolean> {
    const entry = this.history.find(h => h.id === historyId);
    if (!entry || !entry.reversible || !entry.undoData) {
      return false;
    }

    try {
      // Perform undo operation based on type
      switch (entry.type) {
        case 'file_change':
          await this.undoFileChange(entry);
          break;
        case 'circuit_change':
          await this.undoCircuitChange(entry);
          break;
        default:
          console.warn(`Undo not implemented for type: ${entry.type}`);
          return false;
      }

      // Add undo entry to history
      await this.addHistoryEntry(
        entry.type,
        `Undid: ${entry.description}`,
        entry.undoData,
        true,
        entry.data
      );

      this.emit('action-undone', entry);
      return true;
    } catch (error) {
      console.error('Failed to undo action:', error);
      return false;
    }
  }

  private async undoFileChange(entry: HistoryEntry): Promise<void> {
    const { filePath, originalContent } = entry.undoData;
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, originalContent, 'utf8');
    }
  }

  private async undoCircuitChange(entry: HistoryEntry): Promise<void> {
    // Restore circuit state
    this.emit('restore-circuit', entry.undoData);
  }

  // Snapshot Management
  async createSnapshot(name: string, description: string = '', tags: string[] = []): Promise<string> {
    const snapshotId = `snap_${Date.now()}`;
    
    // Capture current project state
    const files = new Map<string, string>();
    await this.captureProjectFiles(this.projectPath, files);

    const snapshot: ProjectSnapshot = {
      id: snapshotId,
      timestamp: new Date(),
      name,
      description,
      files,
      settings: await this.captureProjectSettings(),
      tags
    };

    this.snapshots.set(snapshotId, snapshot);
    await this.saveSnapshots();

    await this.addHistoryEntry(
      'project_action',
      `Created snapshot: ${name}`,
      { snapshotId, name },
      true,
      { type: 'delete_snapshot', snapshotId }
    );

    this.emit('snapshot-created', snapshot);
    return snapshotId;
  }

  private async captureProjectFiles(dirPath: string, files: Map<string, string>, basePath: string = ''): Promise<void> {
    if (!fs.existsSync(dirPath)) return;

    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const relativePath = path.join(basePath, item);
      
      if (fs.statSync(fullPath).isDirectory()) {
        // Skip certain directories
        if (['node_modules', '.git', 'dist', 'build'].includes(item)) continue;
        await this.captureProjectFiles(fullPath, files, relativePath);
      } else {
        // Only capture relevant file types
        const ext = path.extname(item).toLowerCase();
        if (['.ino', '.cpp', '.h', '.c', '.js', '.ts', '.json', '.md', '.txt'].includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            files.set(relativePath, content);
          } catch (error) {
            console.warn(`Failed to read file: ${fullPath}`, error);
          }
        }
      }
    }
  }

  private async captureProjectSettings(): Promise<Record<string, any>> {
    // Capture project settings
    return {
      arduino: {
        board: 'arduino:avr:uno',
        port: 'COM3'
      },
      editor: {
        theme: 'dark',
        fontSize: 14
      },
      timestamp: new Date().toISOString()
    };
  }

  async restoreSnapshot(snapshotId: string): Promise<boolean> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return false;

    try {
      // Create backup before restore
      await this.createSnapshot(`Backup before restore ${snapshot.name}`, 'Auto-created backup', ['backup']);

      // Restore files
      for (const [filePath, content] of snapshot.files) {
        const fullPath = path.join(this.projectPath, filePath);
        const dirPath = path.dirname(fullPath);
        
        // Ensure directory exists
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, content, 'utf8');
      }

      await this.addHistoryEntry(
        'project_action',
        `Restored snapshot: ${snapshot.name}`,
        { snapshotId, restoredAt: new Date() }
      );

      this.emit('snapshot-restored', snapshot);
      return true;
    } catch (error) {
      console.error('Failed to restore snapshot:', error);
      return false;
    }
  }

  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return false;

    this.snapshots.delete(snapshotId);
    await this.saveSnapshots();

    this.emit('snapshot-deleted', snapshot);
    return true;
  }

  async getSnapshots(): Promise<ProjectSnapshot[]> {
    return Array.from(this.snapshots.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private startAutoSnapshot(): void {
    this.snapshotTimer = setInterval(async () => {
      try {
        await this.createSnapshot(
          `Auto-snapshot ${new Date().toLocaleString()}`,
          'Automatically created snapshot',
          ['auto']
        );
      } catch (error) {
        console.warn('Auto-snapshot failed:', error);
      }
    }, this.autoSnapshotInterval);
  }

  // Collaboration Management
  async createCollaborationSession(projectId: string): Promise<string> {
    const sessionId = `collab_${Date.now()}`;
    
    const session: CollaborationSession = {
      id: sessionId,
      projectId,
      participants: [],
      isActive: true,
      createdAt: new Date(),
      lastActivity: new Date(),
      permissions: {
        canEdit: true,
        canBuild: true,
        canUpload: false,
        canInvite: true,
        canManageSettings: false
      }
    };

    this.collaborationSessions.set(sessionId, session);
    this.emit('collaboration-session-created', session);
    
    return sessionId;
  }

  async joinCollaborationSession(sessionId: string, participant: Omit<Participant, 'isOnline' | 'lastSeen' | 'color'>): Promise<boolean> {
    const session = this.collaborationSessions.get(sessionId);
    if (!session || !session.isActive) return false;

    // Assign a color to the participant
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
    const usedColors = session.participants.map(p => p.color);
    const availableColor = colors.find(color => !usedColors.includes(color)) || colors[0];

    const fullParticipant: Participant = {
      ...participant,
      isOnline: true,
      lastSeen: new Date(),
      color: availableColor
    };

    session.participants.push(fullParticipant);
    session.lastActivity = new Date();

    this.emit('participant-joined', { sessionId, participant: fullParticipant });
    
    return true;
  }

  async leaveCollaborationSession(sessionId: string, participantId: string): Promise<boolean> {
    const session = this.collaborationSessions.get(sessionId);
    if (!session) return false;

    const participantIndex = session.participants.findIndex(p => p.id === participantId);
    if (participantIndex === -1) return false;

    const participant = session.participants[participantIndex];
    session.participants.splice(participantIndex, 1);
    session.lastActivity = new Date();

    this.emit('participant-left', { sessionId, participant });
    
    return true;
  }

  async broadcastChange(sessionId: string, change: Omit<ChangeEvent, 'id' | 'timestamp' | 'applied'>): Promise<void> {
    const session = this.collaborationSessions.get(sessionId);
    if (!session) return;

    const fullChange: ChangeEvent = {
      ...change,
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      applied: false
    };

    // Store change for synchronization
    if (!this.activeChanges.has(change.file)) {
      this.activeChanges.set(change.file, []);
    }
    this.activeChanges.get(change.file)!.push(fullChange);

    session.lastActivity = new Date();
    this.emit('change-broadcast', { sessionId, change: fullChange });
  }

  async applyChange(changeId: string): Promise<boolean> {
    for (const [file, changes] of this.activeChanges) {
      const change = changes.find(c => c.id === changeId);
      if (change && !change.applied) {
        // Apply the change to the file
        try {
          const filePath = path.join(this.projectPath, change.file);
          if (fs.existsSync(filePath)) {
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Apply change based on type
            switch (change.type) {
              case 'insert':
                content = this.applyInsertChange(content, change);
                break;
              case 'delete':
                content = this.applyDeleteChange(content, change);
                break;
              case 'replace':
                content = this.applyReplaceChange(content, change);
                break;
            }
            
            fs.writeFileSync(filePath, content, 'utf8');
            change.applied = true;
            
            this.emit('change-applied', change);
            return true;
          }
        } catch (error) {
          console.error('Failed to apply change:', error);
        }
      }
    }
    
    return false;
  }

  private applyInsertChange(content: string, change: ChangeEvent): string {
    const lines = content.split('\n');
    const { line, column } = change.range.start;
    
    if (line < lines.length) {
      const targetLine = lines[line];
      lines[line] = targetLine.slice(0, column) + change.content + targetLine.slice(column);
    } else {
      lines.push(change.content);
    }
    
    return lines.join('\n');
  }

  private applyDeleteChange(content: string, change: ChangeEvent): string {
    const lines = content.split('\n');
    const { start, end } = change.range;
    
    if (start.line === end.line) {
      // Single line deletion
      const line = lines[start.line];
      if (line) {
        lines[start.line] = line.slice(0, start.column) + line.slice(end.column);
      }
    } else {
      // Multi-line deletion
      const startLine = lines[start.line];
      const endLine = lines[end.line];
      
      if (startLine && endLine) {
        lines[start.line] = startLine.slice(0, start.column) + endLine.slice(end.column);
        lines.splice(start.line + 1, end.line - start.line);
      }
    }
    
    return lines.join('\n');
  }

  private applyReplaceChange(content: string, change: ChangeEvent): string {
    // First delete, then insert
    const afterDelete = this.applyDeleteChange(content, change);
    const insertChange = {
      ...change,
      type: 'insert' as const,
      range: { start: change.range.start, end: change.range.start }
    };
    return this.applyInsertChange(afterDelete, insertChange);
  }

  async updateParticipantCursor(sessionId: string, participantId: string, cursor: { file: string; line: number; column: number }): Promise<void> {
    const session = this.collaborationSessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.find(p => p.id === participantId);
    if (participant) {
      participant.cursor = cursor;
      participant.lastSeen = new Date();
      session.lastActivity = new Date();
      
      this.emit('cursor-updated', { sessionId, participantId, cursor });
    }
  }

  // Persistence
  private async loadHistory(): Promise<void> {
    try {
      const historyPath = path.join(this.projectPath, '.arduino-ide', 'history.json');
      if (fs.existsSync(historyPath)) {
        const data = fs.readFileSync(historyPath, 'utf8');
        const parsed = JSON.parse(data);
        this.history = parsed.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load history:', error);
      this.history = [];
    }
  }

  private async saveHistory(): Promise<void> {
    try {
      const historyDir = path.join(this.projectPath, '.arduino-ide');
      if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
      }
      
      const historyPath = path.join(historyDir, 'history.json');
      fs.writeFileSync(historyPath, JSON.stringify(this.history, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  private async saveSnapshots(): Promise<void> {
    try {
      const snapshotsDir = path.join(this.projectPath, '.arduino-ide', 'snapshots');
      if (!fs.existsSync(snapshotsDir)) {
        fs.mkdirSync(snapshotsDir, { recursive: true });
      }

      // Save snapshot metadata
      const metadata = Array.from(this.snapshots.values()).map(snapshot => ({
        id: snapshot.id,
        timestamp: snapshot.timestamp,
        name: snapshot.name,
        description: snapshot.description,
        tags: snapshot.tags
      }));

      const metadataPath = path.join(snapshotsDir, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

      // Save individual snapshot files
      for (const [id, snapshot] of this.snapshots) {
        const snapshotPath = path.join(snapshotsDir, `${id}.json`);
        fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
      }
    } catch (error) {
      console.error('Failed to save snapshots:', error);
    }
  }

  // Cleanup
  dispose(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = undefined;
    }
    
    // Close all collaboration sessions
    for (const session of this.collaborationSessions.values()) {
      session.isActive = false;
    }
    
    this.removeAllListeners();
  }

  // Analytics and Insights
  async getProjectInsights(): Promise<{
    totalChanges: number;
    mostActiveFiles: { file: string; changes: number }[];
    collaborationStats: { sessions: number; participants: number };
    snapshotStats: { total: number; automated: number; manual: number };
  }> {
    const fileChanges = new Map<string, number>();
    
    // Analyze history for file changes
    this.history.forEach(entry => {
      if (entry.type === 'file_change' && entry.data.filePath) {
        const file = entry.data.filePath;
        fileChanges.set(file, (fileChanges.get(file) || 0) + 1);
      }
    });

    const mostActiveFiles = Array.from(fileChanges.entries())
      .map(([file, changes]) => ({ file, changes }))
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 10);

    const snapshots = Array.from(this.snapshots.values());
    const automatedSnapshots = snapshots.filter(s => s.tags.includes('auto'));

    return {
      totalChanges: this.history.length,
      mostActiveFiles,
      collaborationStats: {
        sessions: this.collaborationSessions.size,
        participants: Array.from(this.collaborationSessions.values())
          .reduce((total, session) => total + session.participants.length, 0)
      },
      snapshotStats: {
        total: snapshots.length,
        automated: automatedSnapshots.length,
        manual: snapshots.length - automatedSnapshots.length
      }
    };
  }
}

export default HistoryManager;
