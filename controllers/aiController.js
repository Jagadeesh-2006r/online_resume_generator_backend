const pool = require('../config/db');

// AI Summary Generator (rule-based, no external API needed)
exports.generateSummary = async (req, res) => {
  try {
    const { name, role, experience, skills, education } = req.body;

    const expYears = Array.isArray(experience) ? experience.length : 0;
    const topSkills = Array.isArray(skills) ? skills.slice(0, 3).map((s) => s.name || s).join(', ') : skills;
    const latestEdu = Array.isArray(education) && education[0] ? education[0].degree || 'degree' : 'degree';

    const templates = [
      `Results-driven ${role || 'professional'} with ${expYears > 0 ? `${expYears}+ years of` : 'strong'} experience in ${topSkills || 'various technologies'}. Holding a ${latestEdu}, I am passionate about delivering high-quality solutions and continuously improving my skills to drive organizational success.`,
      `Dynamic ${role || 'professional'} skilled in ${topSkills || 'multiple domains'} with a proven track record of delivering impactful results. ${expYears > 0 ? `With ${expYears}+ years of hands-on experience,` : 'Eager to leverage my expertise,'} I bring a blend of technical expertise and problem-solving abilities to every project.`,
      `Motivated ${role || 'professional'} with expertise in ${topSkills || 'key technologies'}. Committed to leveraging my ${latestEdu} background and ${expYears > 0 ? `${expYears}+ years of` : 'growing'} experience to contribute meaningfully to innovative teams and challenging projects.`,
    ];

    const summary = templates[Math.floor(Math.random() * templates.length)];
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateSkillSuggestions = async (req, res) => {
  try {
    const { role, currentSkills } = req.body;

    const skillMap = {
      'frontend developer': ['React.js', 'Vue.js', 'TypeScript', 'Tailwind CSS', 'Next.js', 'Redux', 'GraphQL', 'Jest'],
      'backend developer': ['Node.js', 'Express.js', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'REST APIs', 'GraphQL'],
      'full stack developer': ['React.js', 'Node.js', 'PostgreSQL', 'MongoDB', 'Docker', 'TypeScript', 'AWS', 'Redis'],
      'data scientist': ['Python', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn', 'SQL', 'Tableau'],
      'devops engineer': ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform', 'Jenkins', 'Linux', 'Ansible'],
      'mobile developer': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Firebase', 'REST APIs', 'Redux', 'SQLite'],
      'ui/ux designer': ['Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'User Research', 'Wireframing', 'CSS', 'HTML'],
    };

    const roleKey = (role || '').toLowerCase();
    const matched = Object.keys(skillMap).find((k) => roleKey.includes(k.split(' ')[0]));
    const suggestions = matched ? skillMap[matched] : skillMap['full stack developer'];

    const existing = (currentSkills || []).map((s) => (s.name || s).toLowerCase());
    const filtered = suggestions.filter((s) => !existing.includes(s.toLowerCase()));

    res.json({ success: true, suggestions: filtered.slice(0, 8) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateInterviewQuestions = async (req, res) => {
  try {
    const { skills, role } = req.body;

    const questionBank = {
      'React.js': ['Explain the virtual DOM and how React uses it.', 'What are React hooks and why were they introduced?', 'Explain the difference between controlled and uncontrolled components.'],
      'Node.js': ['What is the event loop in Node.js?', 'How does Node.js handle asynchronous operations?', 'Explain middleware in Express.js.'],
      'PostgreSQL': ['What is the difference between SQL and NoSQL?', 'Explain ACID properties in databases.', 'How do you optimize a slow SQL query?'],
      'Python': ['What are Python decorators?', 'Explain list comprehensions in Python.', 'What is the GIL in Python?'],
      'Docker': ['What is the difference between a container and a VM?', 'Explain Docker Compose.', 'How do you optimize Docker image size?'],
    };

    const questions = [];
    const skillList = Array.isArray(skills) ? skills.map((s) => s.name || s) : [];

    for (const skill of skillList) {
      const matched = Object.keys(questionBank).find((k) => skill.toLowerCase().includes(k.toLowerCase()));
      if (matched) questions.push(...questionBank[matched]);
    }

    const general = [
      `Tell me about yourself and your experience as a ${role || 'developer'}.`,
      'What is your greatest professional achievement?',
      'Where do you see yourself in 5 years?',
      'Describe a challenging project and how you overcame obstacles.',
      'How do you stay updated with the latest technologies?',
    ];

    const allQuestions = [...new Set([...questions, ...general])].slice(0, 15);
    res.json({ success: true, questions: allQuestions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateProjectDescription = async (req, res) => {
  try {
    const { projectName, technologies, role } = req.body;
    const tech = Array.isArray(technologies) ? technologies.join(', ') : technologies || 'modern technologies';

    const descriptions = [
      `Developed ${projectName || 'a web application'} using ${tech}. Implemented key features including user authentication, data management, and responsive UI. Collaborated with team members to deliver the project on time while maintaining code quality and best practices.`,
      `Built ${projectName || 'a full-stack application'} leveraging ${tech}. Designed and implemented RESTful APIs, optimized database queries for performance, and created an intuitive user interface. Achieved significant improvements in application performance and user experience.`,
      `Engineered ${projectName || 'a scalable solution'} with ${tech}. Led the development of core modules, integrated third-party services, and implemented automated testing. The project resulted in improved efficiency and positive user feedback.`,
    ];

    res.json({ success: true, description: descriptions[Math.floor(Math.random() * descriptions.length)] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
