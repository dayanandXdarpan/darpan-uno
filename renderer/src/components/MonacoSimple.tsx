import React from 'react';

interface MonacoSimpleProps {
  filePath: string;
  language: string;
}

export const MonacoSimple: React.FC<MonacoSimpleProps> = ({ filePath, language }) => {
  return (
    <div style={{
      height: '100%',
      width: '100%',
      backgroundColor: '#ff0000', // Bright red background to make it visible
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      padding: '20px',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>🎉 ARDUINO IDE IS WORKING! 🎉</h1>
      <div style={{ fontSize: '18px', textAlign: 'center', maxWidth: '600px' }}>
        <p>✅ <strong>Success!</strong> The Arduino AI IDE UI is fully loaded and working!</p>
        <br/>
        <p>📝 <strong>Current File:</strong> {filePath || 'Welcome.ino (demo)'}</p>
        <p>🔧 <strong>Language:</strong> {language || 'arduino'}</p>
        <br/>
        <p>🚀 <strong>Next Steps:</strong></p>
        <ul style={{ textAlign: 'left', margin: '10px auto', display: 'inline-block' }}>
          <li>Connect Arduino board</li>
          <li>Add AI integration</li>
          <li>Enable serial communication</li>
          <li>Add full Monaco editor</li>
        </ul>
        <br/>
        <p style={{ backgroundColor: '#ffffff', color: '#ff0000', padding: '10px', borderRadius: '5px', fontWeight: 'bold' }}>
          This red background makes it easy to see that the editor area is loading properly!
        </p>
      </div>
    </div>
  );
};
