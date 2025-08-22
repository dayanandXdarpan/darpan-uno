# Darpan Uno v2.0.0

![Darpan Uno Logo](renderer/public/darpan-uno-logo.svg)

**Darpan Uno** - Open Source Arduino Development Environment with AI Integration

*Developed by Dayanand Darpan*

## 🚀 Overview

Darpan Uno is a modern, AI-powered Arduino development environment that combines the simplicity of Arduino IDE with advanced artificial intelligence capabilities. Built with Electron, React, and TypeScript, it provides a seamless development experience for Arduino projects.

## ✨ Features

### 🤖 AI-Powered Development
- **Multi-Model AI Support**: Integrated with OpenAI GPT, Google Gemini, and other AI models
- **Smart Code Generation**: AI-assisted Arduino sketch creation and optimization
- **Intelligent Debugging**: AI-powered error detection and solution suggestions
- **Code Explanation**: Get detailed explanations of Arduino code functionality

### 🛠️ Advanced Arduino Tools
- **Enhanced Serial Monitor**: Real-time communication with Arduino boards
- **Board Manager**: Easy board selection and configuration
- **Library Manager**: Integrated library search and installation
- **Project Manager**: Organize and manage multiple Arduino projects
- **Circuit Simulator**: Visualize and test circuits before deployment

### 💡 Smart Features
- **Auto-Completion**: Intelligent code suggestions and completions
- **Syntax Highlighting**: Advanced syntax highlighting for Arduino C++
- **Error Detection**: Real-time error checking and validation
- **Code Formatting**: Automatic code formatting and beautification
- **Version Control**: Built-in Git integration for project management

### 🎨 Modern Interface
- **Dark/Light Themes**: Customizable interface themes
- **Responsive Design**: Adaptive layout for different screen sizes
- **Tabbed Editor**: Multi-file editing with tabbed interface
- **Split View**: Side-by-side code editing and preview

## 📦 Installation

### Prerequisites
- Node.js 16.x or higher
- npm or yarn package manager
- Arduino CLI (automatically installed)

### Quick Install

1. **Download the latest release**:
   ```bash
   # Download from GitHub Releases
   https://github.com/dayanandXdarpan/darpan-uno/releases/latest
   ```

2. **Clone and build from source**:
   ```bash
   git clone https://github.com/dayanandXdarpan/darpan-uno.git
   cd darpan-uno
   npm install
   npm run build
   npm start
   ```

### Development Setup

```bash
# Clone the repository
git clone https://github.com/dayanandXdarpan/darpan-uno.git
cd darpan-uno

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🔧 Configuration

### AI Models Setup

Create a `.env` file in the root directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Google Gemini Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Other AI Models (Optional)
ANTHROPIC_API_KEY=your_anthropic_key_here
```

### Arduino CLI Configuration

The application automatically configures Arduino CLI. For manual setup:

```bash
# Install Arduino CLI (if not automatically installed)
arduino-cli core update-index
arduino-cli core install arduino:avr
```

## 🎯 Usage

### Getting Started

1. **Launch Darpan Uno**
2. **Select your Arduino board** from the Board Manager
3. **Create a new sketch** or open an existing project
4. **Use AI assistance** for code generation and debugging
5. **Upload to your Arduino** board

### AI-Powered Development

```cpp
// Example: Ask AI to create a blink sketch
// AI will generate optimized code like this:

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
```

### Project Examples

- **IoT Sensor Networks**: Create smart sensor projects with AI optimization
- **Robotics Projects**: Build and program robots with intelligent control
- **Home Automation**: Develop smart home solutions with AI integration
- **Educational Projects**: Learn Arduino programming with AI tutoring

## 📚 Documentation

- [Installation Guide](docs/installation.md)
- [User Manual](docs/user-guide.md)
- [API Reference](docs/api-reference.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Troubleshooting](docs/troubleshooting.md)

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code of Conduct
- Development Process
- Pull Request Guidelines
- Issue Reporting

### Development Workflow

```bash
# Fork the repository
# Clone your fork
git clone https://github.com/YOUR_USERNAME/darpan-uno.git

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes and commit
git commit -m "Add amazing feature"

# Push to your fork
git push origin feature/amazing-feature

# Create a Pull Request
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Copyright © 2025 Dayanand Darpan**

## 🔒 Security

For security vulnerabilities, please see our [Security Policy](SECURITY.md).

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/dayanandXdarpan/darpan-uno/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dayanandXdarpan/darpan-uno/discussions)
- **Email**: support@darpanuno.com

## 🌟 Acknowledgments

- **Arduino Community**: For the amazing ecosystem and tools
- **OpenAI**: For GPT models and AI capabilities
- **Google**: For Gemini AI integration
- **Electron Team**: For the cross-platform framework
- **React Team**: For the UI framework
- **TypeScript Team**: For type safety and developer experience

## 🎉 Star History

⭐ **Star this repository** if you find Darpan Uno helpful!

---

**Built with ❤️ by Dayanand Darpan**

*Making Arduino development smarter, faster, and more accessible.*
