import React, { useState, useEffect, useRef } from 'react';
import './SimpleEditor.css';

interface SimpleEditorProps {
  filePath: string;
  language: string;
  onCodeChange?: (code: string) => void;
  fontSize?: number;
  fontFamily?: string;
  code?: string;
  onInsertCode?: (code: string) => void;
}

export const SimpleEditor: React.FC<SimpleEditorProps> = ({ 
  filePath, 
  language, 
  onCodeChange,
  fontSize = 14,
  fontFamily = 'Consolas',
  code: initialCode,
  onInsertCode
}) => {
  const [code, setCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [openTabs, setOpenTabs] = useState<Array<{name: string, content: string, active: boolean}>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Load file content when filePath changes
  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      return;
    }

    if (!filePath) {
      const defaultCode = `// Welcome to Arduino AI IDE!
// Enhanced with AI assistance and modern IDE features
// Use Ctrl+Shift+P to open command palette
// Use Ctrl+/ to toggle comments
// Use Ctrl+F to find and replace

void setup() {
  // Initialize your Arduino here
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
  
  Serial.println("Arduino AI IDE - Ready!");
  Serial.println("Enhanced IDE with AI assistance");
}

void loop() {
  // Main program loop
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("LED ON - AI suggestions available");
  delay(1000);
  
  digitalWrite(LED_BUILTIN, LOW);
  Serial.println("LED OFF");
  delay(1000);
  
  // Ask AI for help with your Arduino projects!
}`;
      setCode(defaultCode);
      return;
    }

    // Handle template file paths
    if (filePath.includes('web-template-')) {
      // This is a web template, show sample content
      const templateContent = getTemplateContent(filePath);
      setCode(templateContent);
      return;
    }

    const loadFile = async () => {
      setIsLoading(true);
      try {
        // Web mode fallback - always use demo content
        setCode(`// File: ${filePath}
// Web mode - file system access not available
// This is a demonstration of the Arduino IDE interface

void setup() {
  // Initialize your hardware here
  Serial.begin(9600);
}

void loop() {
  // Main program logic here
  
}`);
      } catch (error) {
        console.error('Failed to load file:', error);
        setCode(`// Error loading file: ${filePath}
// Check if the file exists and is accessible

void setup() {
  
}

void loop() {
  
}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [filePath]);

  const getTemplateContent = (templatePath: string): string => {
    if (templatePath.includes('LED') || templatePath.includes('led_blink')) {
      return `// LED Blink Example
const int ledPin = 13;

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("LED Blink Example Started");
}

void loop() {
  digitalWrite(ledPin, HIGH);   // turn the LED on
  Serial.println("LED ON");
  delay(1000);                  // wait for a second
  
  digitalWrite(ledPin, LOW);    // turn the LED off
  Serial.println("LED OFF");
  delay(1000);                  // wait for a second
}`;
    }
    
    if (templatePath.includes('sensor')) {
      return `// Sensor Reading Example
const int sensorPin = A0;
int sensorValue = 0;

void setup() {
  Serial.begin(9600);
  Serial.println("Sensor Reading Example Started");
}

void loop() {
  sensorValue = analogRead(sensorPin);
  
  Serial.print("Sensor Value: ");
  Serial.println(sensorValue);
  
  // Convert to voltage (0-5V)
  float voltage = sensorValue * (5.0 / 1023.0);
  Serial.print("Voltage: ");
  Serial.println(voltage);
  
  delay(500);
}`;
    }
    
    if (templatePath.includes('serial')) {
      return `// Serial Communication Example
String inputString = "";
boolean stringComplete = false;

void setup() {
  Serial.begin(9600);
  Serial.println("Arduino Ready!");
  Serial.println("Type something and press Enter:");
  inputString.reserve(200);
}

void loop() {
  if (stringComplete) {
    Serial.print("You sent: ");
    Serial.println(inputString);
    
    // Clear the string for next input
    inputString = "";
    stringComplete = false;
    
    Serial.println("Send another message:");
  }
}

void serialEvent() {
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    inputString += inChar;
    
    if (inChar == '\\n') {
      stringComplete = true;
    }
  }
}`;
    }
    
    if (templatePath.includes('wifi') || templatePath.includes('iot')) {
      return `// WiFi IoT Example for ESP32/ESP8266
#include <WiFi.h>

const char* ssid = "YourWiFiName";
const char* password = "YourWiFiPassword";

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Your IoT code here
  Serial.println("WiFi Status: Connected");
  delay(5000);
}`;
    }
    
    // Default template
    return `// Basic Arduino Sketch
void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
}

void loop() {
  // put your main code here, to run repeatedly:
  
}`;
  };

  const handleCodeChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = event.target.value;
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isCtrl = event.ctrlKey || event.metaKey;
    
    // Enhanced keyboard shortcuts
    if (isCtrl) {
      switch (event.key) {
        case 'p':
          if (event.shiftKey) {
            event.preventDefault();
            setShowCommandPalette(true);
            return;
          }
          break;
        case 'f':
          event.preventDefault();
          setShowFindReplace(true);
          return;
        case '/':
          event.preventDefault();
          toggleComments();
          return;
        case 'd':
          event.preventDefault();
          duplicateLine();
          return;
        case 'l':
          event.preventDefault();
          selectCurrentLine();
          return;
        case '[':
          event.preventDefault();
          indentLines(false);
          return;
        case ']':
          event.preventDefault();
          indentLines(true);
          return;
      }
    }

    // Handle tab key for indentation
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (event.shiftKey) {
        // Shift+Tab: Unindent
        const lines = code.split('\n');
        const startLine = code.substring(0, start).split('\n').length - 1;
        const endLine = code.substring(0, end).split('\n').length - 1;
        
        for (let i = startLine; i <= endLine; i++) {
          if (lines[i].startsWith('  ')) {
            lines[i] = lines[i].substring(2);
          }
        }
        
        const newCode = lines.join('\n');
        setCode(newCode);
        onCodeChange?.(newCode);
      } else {
        // Tab: Indent
        if (start === end) {
          // Single cursor
          const newCode = code.substring(0, start) + '  ' + code.substring(end);
          setCode(newCode);
          onCodeChange?.(newCode);
          
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 2;
          }, 0);
        } else {
          // Selection: indent all lines
          const lines = code.split('\n');
          const startLine = code.substring(0, start).split('\n').length - 1;
          const endLine = code.substring(0, end).split('\n').length - 1;
          
          for (let i = startLine; i <= endLine; i++) {
            lines[i] = '  ' + lines[i];
          }
          
          const newCode = lines.join('\n');
          setCode(newCode);
          onCodeChange?.(newCode);
        }
      }
    }

    // Handle Ctrl+S for save
    if (isCtrl && event.key === 's') {
      event.preventDefault();
      console.log('Save shortcut triggered');
      // In a real implementation, this would save the file
    }

    // Handle Enter for auto-indentation
    if (event.key === 'Enter') {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const lineStart = code.lastIndexOf('\n', start - 1) + 1;
      const currentLine = code.substring(lineStart, start);
      const indent = currentLine.match(/^(\s*)/)?.[1] || '';
      
      // Add extra indent for opening braces
      const extraIndent = currentLine.trim().endsWith('{') ? '  ' : '';
      
      event.preventDefault();
      const newCode = code.substring(0, start) + '\n' + indent + extraIndent + code.substring(start);
      setCode(newCode);
      onCodeChange?.(newCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length + extraIndent.length;
      }, 0);
    }
  };

  const toggleComments = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lines = code.split('\n');
    const startLine = code.substring(0, start).split('\n').length - 1;
    const endLine = code.substring(0, end).split('\n').length - 1;

    let allCommented = true;
    for (let i = startLine; i <= endLine; i++) {
      if (!lines[i].trim().startsWith('//')) {
        allCommented = false;
        break;
      }
    }

    for (let i = startLine; i <= endLine; i++) {
      if (allCommented) {
        // Uncomment
        lines[i] = lines[i].replace(/^\s*\/\/\s?/, '');
      } else {
        // Comment
        const indent = lines[i].match(/^(\s*)/)?.[1] || '';
        lines[i] = indent + '// ' + lines[i].trim();
      }
    }

    const newCode = lines.join('\n');
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  const duplicateLine = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = code.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = code.indexOf('\n', start);
    const currentLine = code.substring(lineStart, lineEnd === -1 ? code.length : lineEnd);
    
    const newCode = code.substring(0, lineEnd === -1 ? code.length : lineEnd) + 
                   '\n' + currentLine + 
                   code.substring(lineEnd === -1 ? code.length : lineEnd);
    
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  const selectCurrentLine = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = code.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = code.indexOf('\n', start);
    
    textarea.selectionStart = lineStart;
    textarea.selectionEnd = lineEnd === -1 ? code.length : lineEnd;
  };

  const indentLines = (indent: boolean) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lines = code.split('\n');
    const startLine = code.substring(0, start).split('\n').length - 1;
    const endLine = code.substring(0, end).split('\n').length - 1;

    for (let i = startLine; i <= endLine; i++) {
      if (indent) {
        lines[i] = '  ' + lines[i];
      } else {
        if (lines[i].startsWith('  ')) {
          lines[i] = lines[i].substring(2);
        }
      }
    }

    const newCode = lines.join('\n');
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  // Sync line numbers with textarea scroll
  const handleTextareaScroll = () => {
    const textarea = textareaRef.current;
    const lineNumbers = lineNumbersRef.current;
    if (textarea && lineNumbers) {
      lineNumbers.scrollTop = textarea.scrollTop;
    }
  };

  // Save functionality
  const handleSave = async () => {
    try {
      console.log('Saving file:', filePath);
      // In web mode, simulate save
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath ? filePath.split('/').pop() || 'sketch.ino' : 'sketch.ino';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Show success message
      console.log('File saved successfully!');
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  // Format code functionality
  const handleFormat = () => {
    let formattedCode = code;
    
    // Basic Arduino code formatting
    const lines = formattedCode.split('\n');
    let indentLevel = 0;
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      
      // Decrease indent for closing braces
      if (trimmed.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      const formatted = '  '.repeat(indentLevel) + trimmed;
      
      // Increase indent for opening braces
      if (trimmed.endsWith('{')) {
        indentLevel++;
      }
      
      return formatted;
    });
    
    const newCode = formattedLines.join('\n');
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  // Find functionality
  const handleFind = () => {
    setShowFindReplace(!showFindReplace);
  };

  // Split editor functionality
  const handleSplitEditor = () => {
    setIsSplitMode(!isSplitMode);
  };

  if (isLoading) {
    return (
      <div className="simple-editor loading">
        <div className="loading-message">Loading file...</div>
      </div>
    );
  }

  return (
    <div className="simple-editor">
      <div className="editor-header">
        <div className="file-info">
          <span className="file-icon">📄</span>
          <span className="file-name">
            {filePath ? filePath.split('/').pop() || 'Untitled' : 'Welcome.ino'}
          </span>
          <span className="language-badge">{language}</span>
        </div>
        <div className="editor-actions">
          <button className="editor-btn" title="Save (Ctrl+S)" onClick={handleSave}>
            <span className="icon">💾</span>
            Save
          </button>
          <button className="editor-btn" title="Format Code" onClick={handleFormat}>
            <span className="icon">✨</span>
            Format
          </button>
          <button className="editor-btn" title="Find (Ctrl+F)" onClick={handleFind}>
            <span className="icon">🔍</span>
            Find
          </button>
          <button 
            className={`editor-btn ${isSplitMode ? 'active' : ''}`} 
            title="Split Editor" 
            onClick={handleSplitEditor}
          >
            <span className="icon">⬌</span>
            Split
          </button>
        </div>
      </div>
      
      <div className={`editor-content ${isSplitMode ? 'split' : ''}`}>
        {isSplitMode ? (
          <>
            <div className="editor-pane">
              <div className="line-numbers" ref={lineNumbersRef}>
                {code.split('\n').map((_, index) => (
                  <div key={index} className="line-number">
                    {index + 1}
                  </div>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                value={code}
                onChange={handleCodeChange}
                onKeyDown={handleKeyDown}
                onScroll={handleTextareaScroll}
                className="code-textarea"
                placeholder="Start typing your Arduino code here..."
                spellCheck={false}
              />
            </div>
            <div className="split-handle"></div>
            <div className="editor-pane">
              <div className="line-numbers">
                {code.split('\n').map((_, index) => (
                  <div key={index} className="line-number">
                    {index + 1}
                  </div>
                ))}
              </div>
              <textarea
                value={code}
                className="code-textarea"
                placeholder="Split view - shows same content"
                spellCheck={false}
                readOnly
              />
            </div>
          </>
        ) : (
          <>
            <div className="line-numbers" ref={lineNumbersRef}>
              {code.split('\n').map((_, index) => (
                <div key={index} className="line-number">
                  {index + 1}
                </div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              onScroll={handleTextareaScroll}
              className="code-textarea"
              placeholder="Start typing your Arduino code here..."
              spellCheck={false}
            />
          </>
        )}
      </div>
      
      <div className="editor-footer">
        <div className="status-info">
          <span>Lines: {code.split('\n').length}</span>
          <span>Chars: {code.length}</span>
          <span>Language: {language}</span>
          {isSplitMode && <span>Split Mode: ON</span>}
        </div>
      </div>

      {/* Find/Replace Modal */}
      {showFindReplace && (
        <div className="find-replace-modal">
          <div className="find-replace-content">
            <div className="find-replace-header">
              <h4>Find & Replace</h4>
              <button 
                className="close-btn" 
                onClick={() => setShowFindReplace(false)}
              >
                ×
              </button>
            </div>
            <div className="find-replace-body">
              <div className="input-group">
                <label>Find:</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search text..."
                />
              </div>
              <div className="input-group">
                <label>Replace:</label>
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Replace with..."
                />
              </div>
              <div className="find-replace-actions">
                <button className="editor-btn secondary">Find Next</button>
                <button className="editor-btn secondary">Replace</button>
                <button className="editor-btn">Replace All</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
