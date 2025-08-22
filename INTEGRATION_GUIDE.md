# Integration Guide: Enhanced Chat & Project Explorer

## Quick Implementation Steps

### 1. Replace Existing Chat Component

Update your main layout file to use the enhanced chat:

```typescript
// In renderer/src/components/Layout.tsx or similar
import { EnhancedChat } from './EnhancedChat';
import { EnhancedProjectExplorer } from './EnhancedProjectExplorer';

// Replace existing chat imports with:
// import { UnifiedAIChat } from './UnifiedAIChat'; // REMOVE
// import { MinimizableChat } from './MinimizableChat'; // REMOVE

const Layout = () => {
  const [currentFile, setCurrentFile] = useState('');
  const [chatVisible, setChatVisible] = useState(true);

  return (
    <div className="main-layout">
      {/* Left Panel - Project Explorer */}
      <div className="left-panel">
        <EnhancedProjectExplorer
          onFileSelect={setCurrentFile}
          currentFile={currentFile}
        />
      </div>

      {/* Center Panel - Code Editor */}
      <div className="center-panel">
        <CodeEditor currentFile={currentFile} />
      </div>

      {/* Right Panel - Enhanced Chat */}
      <div className="right-panel">
        <EnhancedChat
          currentFile={currentFile}
          visible={chatVisible}
          onToggle={() => setChatVisible(!chatVisible)}
        />
      </div>
    </div>
  );
};
```

### 2. Update Layout CSS

Add to your main layout CSS:

```css
/* In renderer/src/App.css or Layout.css */
.main-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--vscode-editor-background);
}

.left-panel {
  width: 280px;
  min-width: 200px;
  max-width: 400px;
  resize: horizontal;
  overflow: hidden;
  background: var(--vscode-sideBar-background);
  border-right: 1px solid var(--vscode-sideBar-border);
}

.center-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--vscode-editor-background);
}

.right-panel {
  width: 350px;
  min-width: 250px;
  max-width: 500px;
  resize: horizontal;
  overflow: hidden;
  background: var(--vscode-sideBar-background);
  border-left: 1px solid var(--vscode-sideBar-border);
}

/* Responsive breakpoints */
@media (max-width: 1200px) {
  .right-panel {
    width: 300px;
  }
}

@media (max-width: 900px) {
  .main-layout {
    flex-direction: column;
  }
  
  .left-panel,
  .right-panel {
    width: 100%;
    height: 200px;
  }
  
  .center-panel {
    flex: 1;
    min-height: 400px;
  }
}
```

### 3. Developer Name Configuration

Add developer configuration to your app:

```typescript
// In renderer/src/config/developer.ts
export interface DeveloperConfig {
  name: string;
  role: string;
  avatar?: string;
  email?: string;
  github?: string;
}

export const getDeveloperConfig = (): DeveloperConfig => {
  return {
    name: process.env.DEVELOPER_NAME || 'Arduino Developer',
    role: process.env.DEVELOPER_ROLE || 'Firmware Engineer',
    avatar: process.env.DEVELOPER_AVATAR,
    email: process.env.DEVELOPER_EMAIL,
    github: process.env.DEVELOPER_GITHUB
  };
};

// Usage in components
import { getDeveloperConfig } from '../config/developer';

const developerInfo = getDeveloperConfig();
```

### 4. File System Integration

Connect the enhanced project explorer to your existing file system:

```typescript
// In electron/services/fileSystem.ts
export class FileSystemService {
  async readWorkspaceFiles(rootPath: string): Promise<FileNode[]> {
    // Your existing file reading logic
    return await this.scanDirectory(rootPath);
  }

  async createFile(filePath: string, content: string = ''): Promise<void> {
    // Your existing file creation logic
    await fs.promises.writeFile(filePath, content, 'utf8');
  }

  async createDirectory(dirPath: string): Promise<void> {
    // Your existing directory creation logic
    await fs.promises.mkdir(dirPath, { recursive: true });
  }

  async deleteItem(itemPath: string): Promise<void> {
    // Your existing deletion logic
    const stat = await fs.promises.stat(itemPath);
    if (stat.isDirectory()) {
      await fs.promises.rmdir(itemPath, { recursive: true });
    } else {
      await fs.promises.unlink(itemPath);
    }
  }
}
```

### 5. Chat State Persistence

Add conversation persistence:

```typescript
// In electron/services/chatPersistence.ts
export class ChatPersistenceService {
  private storageFile = path.join(app.getPath('userData'), 'chat-history.json');

  async saveConversation(conversation: ChatMessage[]): Promise<string> {
    const checkpoint = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      messages: conversation,
      metadata: {
        fileContext: this.getCurrentFileContext(),
        modelUsed: this.getCurrentModel()
      }
    };

    const history = await this.loadHistory();
    history.checkpoints.push(checkpoint);
    
    await fs.promises.writeFile(this.storageFile, JSON.stringify(history, null, 2));
    return checkpoint.id;
  }

  async loadConversation(checkpointId: string): Promise<ChatMessage[]> {
    const history = await this.loadHistory();
    const checkpoint = history.checkpoints.find(cp => cp.id === checkpointId);
    return checkpoint?.messages || [];
  }

  private async loadHistory(): Promise<ChatHistory> {
    try {
      const data = await fs.promises.readFile(this.storageFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return { checkpoints: [] };
    }
  }
}
```

### 6. Update Component Exports

Update your component index file:

```typescript
// In renderer/src/components/index.ts
export { EnhancedChat } from './EnhancedChat';
export { EnhancedProjectExplorer } from './EnhancedProjectExplorer';

// Keep existing exports that are still needed
export { CodeEditor } from './CodeEditor';
export { Terminal } from './Terminal';
// ... other components
```

### 7. Environment Variables

Add developer configuration to your environment:

```bash
# .env file
DEVELOPER_NAME="Your Name"
DEVELOPER_ROLE="Arduino Developer"
DEVELOPER_EMAIL="your.email@example.com"
DEVELOPER_GITHUB="yourusername"
```

### 8. Package.json Dependencies

Ensure you have the required dependencies:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

## Testing the Integration

### 1. Chat Functionality Test
```typescript
// Test pause/resume
const testChatControls = () => {
  // 1. Start a conversation
  // 2. Click pause during AI response
  // 3. Verify response stops
  // 4. Click resume
  // 5. Verify response continues
};

// Test conversation save/restore
const testConversationPersistence = () => {
  // 1. Have a conversation
  // 2. Save checkpoint
  // 3. Continue conversation
  // 4. Restore checkpoint
  // 5. Verify history restored
};
```

### 2. File Explorer Test
```typescript
// Test empty folder handling
const testEmptyFolderHandling = () => {
  // 1. Navigate to empty folder
  // 2. Verify "create first file" prompt appears
  // 3. Click prompt
  // 4. Verify file creation dialog opens
};

// Test file creation
const testFileCreation = () => {
  // 1. Right-click in folder
  // 2. Select "New File"
  // 3. Enter filename
  // 4. Verify file appears in tree
  // 5. Verify file opens in editor
};
```

### 3. Integration Test
```typescript
// Test file-to-chat context
const testFileContext = () => {
  // 1. Select Arduino file in explorer
  // 2. Verify file opens in editor
  // 3. Ask AI question about file
  // 4. Verify AI has file context
};
```

## Migration from Existing Components

### If you have existing UnifiedAIChat:
1. Copy any custom message types to EnhancedChat
2. Migrate conversation history format
3. Update any parent components using the old chat
4. Remove old chat files after testing

### If you have existing file explorer:
1. Export current workspace structure
2. Update file selection handlers
3. Migrate any custom file operations
4. Test file creation workflows

## Troubleshooting

### Common Issues:

1. **Chat not showing developer name**
   - Check environment variables are set
   - Verify developer config is properly imported

2. **File explorer empty state not working**
   - Check folder scanning logic
   - Verify empty folder detection

3. **Responsive layout breaking**
   - Check CSS grid/flex properties
   - Test on different screen sizes

4. **Performance issues with large file trees**
   - Implement virtual scrolling
   - Add lazy loading for folders

### Performance Monitoring:
```typescript
// Add to your main component
const usePerformanceMonitoring = () => {
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 100) {
          console.warn('Slow operation:', entry.name, entry.duration);
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure'] });
    return () => observer.disconnect();
  }, []);
};
```

This integration guide provides a complete path to implement the enhanced chat and project explorer components with minimal disruption to your existing codebase.
