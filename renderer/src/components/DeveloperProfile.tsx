import React, { useState } from 'react';
import './DeveloperProfile.css';

interface DeveloperProfileProps {
  isVisible: boolean;
  onClose: () => void;
}

export const DeveloperProfile: React.FC<DeveloperProfileProps> = ({ isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState('about');

  if (!isVisible) return null;

  const developerInfo = {
    name: "Dayanand Darpan",
    title: "Creative Developer & Innovation Engineer",
    email: "dayanand.darpan@gmail.com",
    website: "https://www.dayananddarpan.me",
    github: "https://github.com/dayanandXdarpan",
    linkedin: "https://linkedin.com/in/dayanand-b47448287",
    location: "Patna, India",
    bio: "Passionate developer driven by curiosity and creativity. I specialize in building innovative, user-centric digital solutions that blend technical excellence with creative thinking.",
    skills: {
      frontend: ["React", "Next.js", "Vue.js", "TypeScript", "JavaScript (ES6+)", "HTML5", "CSS3", "TailwindCSS"],
      backend: ["Node.js", "Express.js", "Python (Flask/Django)", "REST APIs"],
      databases: ["PostgreSQL", "MongoDB", "MySQL"],
      tools: ["Git", "Docker", "AWS", "Vercel", "Netlify", "Figma"],
      concepts: ["GraphQL", "Microservices", "DevOps", "Agile Development"]
    },
    projects: [
      {
        name: "Darpan Uno",
        description: "Advanced Arduino IDE with AI Integration",
        tech: ["Electron", "React", "TypeScript", "AI Integration"],
        status: "Active Development"
      },
      {
        name: "AI-Powered Chatbot",
        description: "Conversational AI platform using GPT-4 for real-time dialogue",
        tech: ["Python", "GPT-4", "FastAPI", "WebSockets"],
        status: "Completed"
      }
    ],
    achievements: [
      "Built 10+ innovative web applications",
      "Expert in modern JavaScript frameworks",
      "AI integration specialist",
      "Open source contributor",
      "Continuous learner and tech enthusiast"
    ]
  };

  const openLink = (url: string) => {
    // Try to use electron API if available
    if (window.electronAPI && (window.electronAPI as any).openExternal) {
      (window.electronAPI as any).openExternal(url);
    } else {
      // Fallback to regular window.open
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="developer-profile-overlay">
      <div className="developer-profile-modal">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-hero">
            <div className="profile-avatar">
              <span className="avatar-text">DD</span>
            </div>
            <div className="profile-info">
              <h1 className="profile-name">{developerInfo.name}</h1>
              <p className="profile-title">{developerInfo.title}</p>
              <p className="profile-location">📍 {developerInfo.location}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Navigation Tabs */}
        <div className="profile-nav">
          <button 
            className={`nav-tab ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            About
          </button>
          <button 
            className={`nav-tab ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            Skills
          </button>
          <button 
            className={`nav-tab ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </button>
          <button 
            className={`nav-tab ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => setActiveTab('contact')}
          >
            Connect
          </button>
        </div>

        {/* Content */}
        <div className="profile-content">
          {activeTab === 'about' && (
            <div className="tab-content">
              <div className="section">
                <h3>🚀 About Me</h3>
                <p className="bio-text">{developerInfo.bio}</p>
                
                <div className="highlights">
                  <h4>✨ Key Highlights</h4>
                  <ul>
                    {developerInfo.achievements.map((achievement, index) => (
                      <li key={index}>{achievement}</li>
                    ))}
                  </ul>
                </div>

                <div className="philosophy">
                  <h4>💡 Development Philosophy</h4>
                  <p>I believe that a blend of technical skill and creative thinking leads to the most impactful solutions. Every project is an opportunity to learn, innovate, and create something meaningful.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="tab-content">
              <div className="skills-grid">
                <div className="skill-category">
                  <h4>🎨 Frontend Development</h4>
                  <div className="skill-tags">
                    {developerInfo.skills.frontend.map((skill, index) => (
                      <span key={index} className="skill-tag frontend">{skill}</span>
                    ))}
                  </div>
                </div>

                <div className="skill-category">
                  <h4>⚙️ Backend Development</h4>
                  <div className="skill-tags">
                    {developerInfo.skills.backend.map((skill, index) => (
                      <span key={index} className="skill-tag backend">{skill}</span>
                    ))}
                  </div>
                </div>

                <div className="skill-category">
                  <h4>🗄️ Databases</h4>
                  <div className="skill-tags">
                    {developerInfo.skills.databases.map((skill, index) => (
                      <span key={index} className="skill-tag database">{skill}</span>
                    ))}
                  </div>
                </div>

                <div className="skill-category">
                  <h4>🛠️ Tools & Platforms</h4>
                  <div className="skill-tags">
                    {developerInfo.skills.tools.map((skill, index) => (
                      <span key={index} className="skill-tag tools">{skill}</span>
                    ))}
                  </div>
                </div>

                <div className="skill-category">
                  <h4>🏗️ Concepts & Patterns</h4>
                  <div className="skill-tags">
                    {developerInfo.skills.concepts.map((skill, index) => (
                      <span key={index} className="skill-tag concepts">{skill}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="tab-content">
              <div className="projects-list">
                {developerInfo.projects.map((project, index) => (
                  <div key={index} className="project-card">
                    <div className="project-header">
                      <h4 className="project-name">🚀 {project.name}</h4>
                      <span className={`project-status ${project.status.toLowerCase().replace(' ', '-')}`}>
                        {project.status}
                      </span>
                    </div>
                    <p className="project-description">{project.description}</p>
                    <div className="project-tech">
                      {project.tech.map((tech, techIndex) => (
                        <span key={techIndex} className="tech-tag">{tech}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="more-projects">
                <p>🔍 <strong>Want to see more?</strong></p>
                <button 
                  className="link-btn"
                  onClick={() => openLink(developerInfo.github)}
                >
                  Visit my GitHub for complete portfolio →
                </button>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="tab-content">
              <div className="contact-grid">
                <div className="contact-card" onClick={() => openLink(`mailto:${developerInfo.email}`)}>
                  <div className="contact-icon">📧</div>
                  <div className="contact-info">
                    <h4>Email</h4>
                    <p>{developerInfo.email}</p>
                  </div>
                </div>

                <div className="contact-card" onClick={() => openLink(developerInfo.website)}>
                  <div className="contact-icon">🌐</div>
                  <div className="contact-info">
                    <h4>Portfolio Website</h4>
                    <p>dayananddarpan.me</p>
                  </div>
                </div>

                <div className="contact-card" onClick={() => openLink(developerInfo.github)}>
                  <div className="contact-icon">💻</div>
                  <div className="contact-info">
                    <h4>GitHub</h4>
                    <p>@dayanandXdarpan</p>
                  </div>
                </div>

                <div className="contact-card" onClick={() => openLink(developerInfo.linkedin)}>
                  <div className="contact-icon">💼</div>
                  <div className="contact-info">
                    <h4>LinkedIn</h4>
                    <p>Connect professionally</p>
                  </div>
                </div>
              </div>

              <div className="contact-message">
                <h4>💬 Let's Connect!</h4>
                <p>Have a project in mind, a question, or just want to connect? I'd love to hear from you. Whether it's about collaboration, tech discussions, or exciting opportunities - feel free to reach out!</p>
                
                <div className="contact-actions">
                  <button 
                    className="primary-btn"
                    onClick={() => openLink(`mailto:${developerInfo.email}?subject=Hello from Darpan Uno!`)}
                  >
                    📧 Send Email
                  </button>
                  <button 
                    className="secondary-btn"
                    onClick={() => openLink(developerInfo.website)}
                  >
                    🌐 Visit Portfolio
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="profile-footer">
          <p>© 2025 Dayanand Darpan. Building the future, one line of code at a time.</p>
        </div>
      </div>
    </div>
  );
};

export default DeveloperProfile;
