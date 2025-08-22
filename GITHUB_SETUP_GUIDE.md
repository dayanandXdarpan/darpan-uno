# 🚀 GitHub Setup & Deployment Guide for Darpan Uno

**Complete guide for publishing Darpan Uno to GitHub as an open source project**

---

## 📋 Step-by-Step GitHub Setup

### **Step 1: Create GitHub Repository**

1. **Go to GitHub**: [https://github.com/new](https://github.com/new)
2. **Repository Details**:
   - **Repository name**: `darpan-uno`
   - **Description**: `Open Source Advanced Arduino IDE with AI Integration`
   - **Visibility**: ✅ **Public** (for open source)
   - **Initialize**: ❌ Don't initialize (we have local repo ready)

3. **Click "Create repository"**

### **Step 2: Connect Local Repository**

Open PowerShell in the project directory and run:

```bash
# Add GitHub remote origin
git remote add origin https://github.com/dayananddarpan/darpan-uno.git

# Push initial commit to main branch
git branch -M main
git push -u origin main
```

### **Step 3: Setup Repository Settings**

#### **General Settings**
- Go to repository **Settings** → **General**
- **Features**:
  - ✅ Issues
  - ✅ Projects  
  - ✅ Wiki
  - ✅ Discussions
  - ✅ Sponsorships

#### **Pages Setup** (Optional Website)
- Go to **Settings** → **Pages**
- **Source**: Deploy from a branch
- **Branch**: `main` / `docs` (if you want project website)

#### **Topics & Description**
- Add **topics**: `arduino`, `ide`, `ai`, `electron`, `typescript`, `iot`, `programming`, `open-source`
- **Website**: `https://www.dayananddarpan.me/darpan-uno`

---

## 📦 Creating Releases & Downloads

### **Step 1: Prepare Build**

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Create distribution packages
npm run dist
```

This creates files in the `dist/` folder:
- `Darpan Uno-setup-2.0.0.exe` (Windows Installer)
- `darpan-uno-portable-2.0.0.zip` (Windows Portable)

### **Step 2: Create GitHub Release**

1. **Go to Releases**: [https://github.com/dayananddarpan/darpan-uno/releases](https://github.com/dayananddarpan/darpan-uno/releases)
2. **Click "Create a new release"**
3. **Release Details**:
   - **Tag version**: `v2.0.0`
   - **Release title**: `🚀 Darpan Uno v2.0.0 - Initial Open Source Release`
   - **Description**:

```markdown
# 🎉 Welcome to Darpan Uno v2.0.0!

**The first open source release of Darpan Uno - Advanced Arduino IDE with AI Integration**

## ✨ What's New
- 🆓 **Free AI Assistant** - No API key required for basic features
- 🤖 **Smart Code Generation** - Write Arduino sketches from natural language
- 🔧 **Intelligent Debugging** - Automatic error detection and fixes
- 📊 **Circuit Designer** - Visual pin connections and component guidance
- 🎯 **Agent Mode** - One-click code insertion into your projects
- 🌐 **Modern UI** - Beautiful, responsive interface inspired by VS Code

## 📥 Download Options

### Windows
- **[📦 Installer (Recommended)](https://github.com/dayananddarpan/darpan-uno/releases/download/v2.0.0/Darpan%20Uno-setup-2.0.0.exe)** - Easy installation with desktop shortcut
- **[💾 Portable ZIP](https://github.com/dayananddarpan/darpan-uno/releases/download/v2.0.0/darpan-uno-portable-2.0.0.zip)** - No installation required

### System Requirements
- Windows 10/11 (64-bit)
- 4GB RAM (8GB recommended)
- 500MB free storage

## 🔗 Links
- **🏠 Project Homepage**: [https://www.dayananddarpan.me/darpan-uno](https://www.dayananddarpan.me/darpan-uno)
- **📚 Documentation**: Available in repository README
- **🐛 Report Issues**: [GitHub Issues](https://github.com/dayananddarpan/darpan-uno/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/dayananddarpan/darpan-uno/discussions)

---

**Built with ❤️ by [Dayanand Darpan](https://www.dayananddarpan.me)**
```

4. **Upload Assets**:
   - Drag and drop the built files from `dist/` folder
   - `Darpan Uno-setup-2.0.0.exe`
   - Create ZIP of portable version if needed

5. **Publish Release** ✅

---

## 🎯 Post-Release Setup

### **Update Repository Description**
In repository main page, edit the description:
```
🚀 Open Source Advanced Arduino IDE with AI Integration - Create Arduino projects using natural language with free AI assistance, smart debugging, and modern UI
```

### **Pin Repository** (Personal Profile)
- Go to your GitHub profile
- Click "Customize your pins"
- Select `darpan-uno` repository

### **Create Project Website** (Optional)
- Create `docs/` folder with `index.html`
- Enable GitHub Pages
- Custom domain: `darpan-uno.dayananddarpan.me`

---

## 📊 Repository Management

### **Issue Templates**
Create `.github/ISSUE_TEMPLATE/` folder with:

#### **Bug Report Template**
```yaml
name: Bug Report
about: Report a bug or issue
title: '[BUG] '
labels: ['bug']
body:
  - type: textarea
    attributes:
      label: Describe the bug
      description: A clear description of what the bug is
    validations:
      required: true
  - type: textarea
    attributes:
      label: Steps to reproduce
      description: Steps to reproduce the behavior
    validations:
      required: true
  - type: textarea
    attributes:
      label: Expected behavior
      description: What you expected to happen
    validations:
      required: true
  - type: textarea
    attributes:
      label: Environment
      description: |
        - OS: [e.g. Windows 11]
        - Darpan Uno Version: [e.g. v2.0.0]
        - Arduino CLI Version: [if applicable]
    validations:
      required: true
```

#### **Feature Request Template**
```yaml
name: Feature Request
about: Suggest a new feature
title: '[FEATURE] '
labels: ['enhancement']
body:
  - type: textarea
    attributes:
      label: Feature Description
      description: Describe the feature you'd like to see
    validations:
      required: true
  - type: textarea
    attributes:
      label: Use Case
      description: Explain how this feature would be useful
    validations:
      required: true
  - type: textarea
    attributes:
      label: Implementation Ideas
      description: Any ideas on how this could be implemented
    validations:
      required: false
```

### **Pull Request Template**
Create `.github/pull_request_template.md`:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] All tests pass
- [ ] No new warnings

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated if needed
- [ ] No merge conflicts
```

---

## 🎨 Branding Assets

### **Repository Social Preview**
Create a 1280×640px image with:
- Darpan Uno logo
- "Open Source Arduino IDE with AI"
- GitHub URL
- Upload in **Settings** → **General** → **Social preview**

### **README Badges**
Already included in README.md:
```markdown
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/dayananddarpan/darpan-uno)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-❤️-red.svg)](https://github.com/dayananddarpan/darpan-uno)
[![Downloads](https://img.shields.io/github/downloads/dayananddarpan/darpan-uno/total.svg)](https://github.com/dayananddarpan/darpan-uno/releases)
```

---

## 📈 Community Building

### **Enable Discussions**
- **Settings** → **Features** → ✅ **Discussions**
- Create categories:
  - 💡 Ideas & Feature Requests
  - 🙋‍♂️ Q&A & Help
  - 🎉 Show and Tell (User Projects)
  - 📢 Announcements

### **Security Policy**
Create `.github/SECURITY.md`:
```markdown
# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please email [dayanand.darpan@gmail.com](mailto:dayanand.darpan@gmail.com) instead of creating a public issue.

## Supported Versions
- v2.0.0 and later: ✅ Supported
- Earlier versions: ❌ Not supported
```

### **Code of Conduct**
GitHub will automatically suggest adding a Code of Conduct template.

---

## 🔄 Automated Workflows (Optional)

Create `.github/workflows/` for CI/CD:

### **Build & Test Workflow**
```yaml
name: Build & Test
on: [push, pull_request]
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm test
```

### **Release Workflow**
```yaml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  release:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run dist
      - uses: softprops/action-gh-release@v1
        with:
          files: dist/*
```

---

## ✅ Launch Checklist

### **Pre-Launch**
- [ ] Repository created and configured
- [ ] All files committed and pushed
- [ ] README.md updated with correct links
- [ ] LICENSE file added
- [ ] CONTRIBUTING.md guide created
- [ ] .gitignore configured properly

### **Launch Day**
- [ ] First release (v2.0.0) created
- [ ] Download links tested and working
- [ ] Social media announcement prepared
- [ ] Documentation reviewed
- [ ] Community features enabled

### **Post-Launch**
- [ ] Monitor GitHub issues and discussions
- [ ] Respond to community feedback
- [ ] Plan next version features
- [ ] Update personal portfolio/website
- [ ] Share on LinkedIn, Twitter, etc.

---

## 🌟 Success Metrics

Track these metrics post-launch:
- ⭐ **GitHub Stars**: Measure community interest
- 📥 **Downloads**: Track user adoption
- 🐛 **Issues**: Monitor user feedback and bugs
- 🍴 **Forks**: See developer engagement
- 💬 **Discussions**: Community activity level

---

**Ready to launch Darpan Uno as an open source project! 🚀**

*Follow this guide step-by-step for a successful GitHub launch with proper downloads, documentation, and community engagement.*
