import React, { useEffect, useRef, useState } from 'react';
import Editor, { Monaco as MonacoEditorInstance } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface MonacoProps {
  filePath: string;
  language: string;
}

export const Monaco: React.FC<MonacoProps> = ({ filePath, language }) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<MonacoEditorInstance | null>(null);
  const [code, setCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Load file content when filePath changes
  useEffect(() => {
    if (!filePath) {
      setCode('// Welcome to Arduino AI IDE!\n// Select a file to start editing or create a new project\n// Use the project explorer on the left\n\nvoid setup() {\n  // Put your setup code here, to run once:\n  \n}\n\nvoid loop() {\n  // Put your main code here, to run repeatedly:\n  \n}');
      return;
    }

    const loadFile = async () => {
      setIsLoading(true);
      try {
        if (window.electronAPI?.file?.read) {
          const content = await window.electronAPI.file.read(filePath);
          setCode(content);
        } else {
          setCode('// File loading not available in this demo\n// This is the UI preview mode');
        }
      } catch (error) {
        console.error('Failed to load file:', error);
        setCode('// Error loading file\n// Check if the file exists and is accessible');
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [filePath]);

  // Setup Monaco editor
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: MonacoEditorInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    // Enhanced scrolling configuration
    editor.updateOptions({
      smoothScrolling: true,
      cursorSmoothCaretAnimation: 'on',
      scrollBeyondLastLine: true,
      scrollbar: {
        vertical: 'hidden',
        horizontal: 'hidden',
        verticalScrollbarSize: 4,
        horizontalScrollbarSize: 4,
        handleMouseWheel: true,
        alwaysConsumeMouseWheel: false
      },
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      mouseWheelScrollSensitivity: 1,
      fastScrollSensitivity: 5
    });

    // Custom scrollbar visibility on hover
    const editorElement = editor.getDomNode();
    if (editorElement) {
      editorElement.addEventListener('mouseenter', () => {
        editor.updateOptions({
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
            handleMouseWheel: true,
            alwaysConsumeMouseWheel: false
          }
        });
      });

      editorElement.addEventListener('mouseleave', () => {
        editor.updateOptions({
          scrollbar: {
            vertical: 'hidden',
            horizontal: 'hidden',
            verticalScrollbarSize: 4,
            horizontalScrollbarSize: 4,
            handleMouseWheel: true,
            alwaysConsumeMouseWheel: false
          }
        });
      });
    }

    // Configure Arduino C++ language support
    monacoInstance.languages.setLanguageConfiguration('cpp', {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ]
    });

    // Add Arduino-specific keywords and functions
    monacoInstance.languages.setMonarchTokensProvider('cpp', {
      tokenizer: {
        root: [
          // Arduino specific functions
          [/\b(setup|loop|pinMode|digitalWrite|digitalRead|analogRead|analogWrite|delay|delayMicroseconds|Serial|Wire|SPI)\b/, 'keyword.arduino'],
          
          // Arduino constants
          [/\b(HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|LED_BUILTIN|A0|A1|A2|A3|A4|A5)\b/, 'constant.arduino'],
          
          // Standard C++ keywords
          [/\b(if|else|for|while|do|switch|case|default|break|continue|return|void|int|float|double|char|bool|String)\b/, 'keyword'],
          
          // Numbers
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/\d+/, 'number'],
          
          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, 'string', '@string_single'],
          
          // Comments
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          
          // Preprocessor
          [/^\s*#\w+/, 'keyword.preprocessor']
        ],
        
        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],
        
        string_double: [
          [/[^\\"]+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/"/, 'string', '@pop']
        ],
        
        string_single: [
          [/[^\\']+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/'/, 'string', '@pop']
        ]
      },
      
      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/
    });

    // Configure editor options for better scrolling and performance
    editor.updateOptions({
      fontSize: 14,
      fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Source Code Pro', Consolas, monospace",
      fontLigatures: true,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: false,
      theme: 'vs-dark',
      minimap: { enabled: true },
      automaticLayout: true,
      wordWrap: 'off',
      folding: true,
      showFoldingControls: 'always',
      matchBrackets: 'always',
      autoIndent: 'full',
      formatOnPaste: true,
      formatOnType: true,
      // Enhanced scrolling options
      smoothScrolling: true,
      cursorSmoothCaretAnimation: 'on',
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
        verticalSliderSize: 8,
        horizontalSliderSize: 8,
        useShadows: true,
        alwaysConsumeMouseWheel: false
      },
      // Performance improvements
      fastScrollSensitivity: 5,
      mouseWheelScrollSensitivity: 1,
      // Better text handling
      wordWrapColumn: 120,
      wrappingIndent: 'indent',
      lineHeight: 1.5,
      letterSpacing: 0.5
    });

    // Auto-save functionality
    let saveTimeout: NodeJS.Timeout;
    editor.onDidChangeModelContent(() => {
      if (filePath && window.electronAPI?.file?.write) {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
          try {
            const currentCode = editor.getValue();
            await window.electronAPI!.file.write(filePath, currentCode);
            console.log('File auto-saved');
          } catch (error) {
            console.error('Auto-save failed:', error);
          }
        }, 2000); // Auto-save after 2 seconds of inactivity
      }
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
      if (filePath && window.electronAPI?.file?.write) {
        try {
          const currentCode = editor.getValue();
          await window.electronAPI!.file.write(filePath, currentCode);
          console.log('File saved');
        } catch (error) {
          console.error('Save failed:', error);
        }
      }
    });

    // Add compile shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyB, () => {
      // Trigger compile - this could emit an event or call a parent function
      console.log('Compile shortcut triggered');
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        color: '#cccccc',
        backgroundColor: '#1e1e1e'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Editor
        height="100%"
        language={language}
        value={code}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          automaticLayout: true,
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: "'Fira Code', 'Cascadia Code', monospace",
          fontLigatures: true,
          minimap: { enabled: true },
          wordWrap: 'off',
          lineNumbers: 'on',
          folding: true,
          showFoldingControls: 'always',
          matchBrackets: 'always',
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: true,
          // Enhanced scrolling
          smoothScrolling: true,
          cursorSmoothCaretAnimation: 'on',
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
            useShadows: true,
            alwaysConsumeMouseWheel: false
          },
          // Performance improvements
          fastScrollSensitivity: 5,
          mouseWheelScrollSensitivity: 1,
          lineHeight: 1.5
        }}
      />
    </div>
  );
};
