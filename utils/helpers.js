const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

const generateSlug = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

const generateShareToken = () => crypto.randomBytes(20).toString('hex');

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
};

const calculateATSScore = (resume) => {
  let score = 0;
  const { personal_info, career_objective, education, experience, skills, projects } = resume;

  if (personal_info?.name) score += 10;
  if (personal_info?.email) score += 5;
  if (personal_info?.phone) score += 5;
  if (personal_info?.location) score += 5;
  if (career_objective && career_objective.length > 50) score += 15;
  if (Array.isArray(education) && education.length > 0) score += 10;
  if (Array.isArray(experience) && experience.length > 0) score += 20;
  if (Array.isArray(skills) && skills.length >= 5) score += 15;
  if (Array.isArray(projects) && projects.length > 0) score += 10;
  if (personal_info?.linkedin) score += 5;

  return Math.min(score, 100);
};

const getATSSuggestions = (resume) => {
  const suggestions = [];
  const { personal_info, career_objective, education, experience, skills, projects } = resume;

  if (!personal_info?.name) suggestions.push('Add your full name');
  if (!personal_info?.email) suggestions.push('Add your email address');
  if (!personal_info?.phone) suggestions.push('Add your phone number');
  if (!personal_info?.location) suggestions.push('Add your location');
  if (!career_objective || career_objective.length < 50) suggestions.push('Write a detailed career objective (50+ characters)');
  if (!Array.isArray(education) || education.length === 0) suggestions.push('Add your education details');
  if (!Array.isArray(experience) || experience.length === 0) suggestions.push('Add work experience');
  if (!Array.isArray(skills) || skills.length < 5) suggestions.push('Add at least 5 skills');
  if (!Array.isArray(projects) || projects.length === 0) suggestions.push('Add projects to showcase your work');
  if (!personal_info?.linkedin) suggestions.push('Add your LinkedIn profile URL');

  return suggestions;
};

module.exports = { generateToken, generateSlug, generateShareToken, sendEmail, calculateATSScore, getATSSuggestions };
