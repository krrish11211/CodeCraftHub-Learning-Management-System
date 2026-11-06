'use strict';

// CodeCraftHub: beginner-friendly REST API with JSON-file storage.
const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const DATA_FILE = process.env.CODECRAFTHUB_DATA_FILE || path.join(__dirname, 'courses.json');
const VALID_STATUSES = ['Not Started', 'In Progress', 'Completed'];
const COURSE_FIELDS = ['name', 'description', 'target_date', 'status'];

app.use(express.json());

// Create courses.json with an empty list on the first run.
async function ensureDataFile() {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  try {
    await fs.writeFile(DATA_FILE, '[]\n', { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    // EEXIST means the file already exists; do not overwrite saved courses.
    if (error.code !== 'EEXIST') throw error;
  }
}

async function readCourses() {
  await ensureDataFile();
  const text = await fs.readFile(DATA_FILE, 'utf8');
  const courses = JSON.parse(text);
  if (!Array.isArray(courses)) {
    throw new Error('courses.json must contain a JSON array');
  }
  return courses;
}

async function saveCourses(courses) {
  await fs.writeFile(DATA_FILE, JSON.stringify(courses, null, 2) + '\n', 'utf8');
}

// Check YYYY-MM-DD AND real calendar dates (e.g. reject 2026-02-30).
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

// Validate submitted data for POST (all fields) and PUT (changed fields only).
function validateCourse(data, partial = false) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return 'Request body must be a JSON object';
  }
  const keys = Object.keys(data);
  if (!partial && COURSE_FIELDS.some((field) => !Object.hasOwn(data, field))) {
    return 'Missing required fields: name, description, target_date, status';
  }
  if (partial && keys.length === 0) return 'Provide at least one field to update';
  if (keys.some((field) => !COURSE_FIELDS.includes(field))) {
    return 'Only name, description, target_date, and status can be provided';
  }
  if (Object.hasOwn(data, 'name') && (typeof data.name !== 'string' || !data.name.trim())) {
    return 'name must be a non-empty string';
  }
  if (Object.hasOwn(data, 'description') && (typeof data.description !== 'string' || !data.description.trim())) {
    return 'description must be a non-empty string';
  }
  if (Object.hasOwn(data, 'target_date') && !validDate(data.target_date)) {
    return 'target_date must be a valid date in YYYY-MM-DD format';
  }
  if (Object.hasOwn(data, 'status') && !VALID_STATUSES.includes(data.status)) {
    return 'status must be Not Started, In Progress, or Completed';
  }
  return null;
}

function courseById(courses, rawId) {
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) return undefined;
  return courses.find((course) => course.id === id);
}

// GET: list all courses.
app.get('/api/courses', async (req, res, next) => {
  try {
    res.status(200).json(await readCourses());
  } catch (error) { next(error); }
});

// GET: retrieve one course.
app.get('/api/courses/:id', async (req, res, next) => {
  try {
    const course = courseById(await readCourses(), req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (error) { next(error); }
});

// POST: create a course; numeric IDs start at 1.
app.post('/api/courses', async (req, res, next) => {
  try {
    const error = validateCourse(req.body);
    if (error) return res.status(400).json({ error });

    const courses = await readCourses();
    const nextId = courses.reduce((max, course) => Math.max(max, course.id || 0), 0) + 1;
    const course = {
      id: nextId,
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      target_date: req.body.target_date,
      status: req.body.status,
      created_at: new Date().toISOString()
    };
    courses.push(course);
    await saveCourses(courses);
    res.status(201).json({ message: 'Course created successfully', course });
  } catch (error) { next(error); }
});

// PUT: update any provided fields; preserve id and created_at.
app.put('/api/courses/:id', async (req, res, next) => {
  try {
    const error = validateCourse(req.body, true);
    if (error) return res.status(400).json({ error });

    const courses = await readCourses();
    const course = courseById(courses, req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    for (const field of COURSE_FIELDS) {
      if (Object.hasOwn(req.body, field)) {
        course[field] = ['name', 'description'].includes(field) ? req.body[field].trim() : req.body[field];
      }
    }
    await saveCourses(courses);
    res.json({ message: 'Course updated successfully', course });
  } catch (error) { next(error); }
});

// DELETE: remove a course by its numeric ID.
app.delete('/api/courses/:id', async (req, res, next) => {
  try {
    const courses = await readCourses();
    const course = courseById(courses, req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    await saveCourses(courses.filter((item) => item.id !== course.id));
    res.json({ message: 'Course deleted successfully', course });
  } catch (error) { next(error); }
});

// Return a readable JSON error for invalid JSON bodies.
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Invalid JSON request body' });
  }
  next(error);
});

// Unknown endpoint.
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Report JSON file read/write problems without exposing internal file paths.
app.use((error, req, res, next) => {
  console.error('CodeCraftHub error:', error.message);
  res.status(500).json({ error: 'Unable to read or save course data' });
});

// Run the server only when executed directly; tests can import the Express app.
if (require.main === module) {
  ensureDataFile()
    .then(() => app.listen(PORT, () => {
      console.log('CodeCraftHub API is starting...');
      console.log(`Data will be stored in: ${DATA_FILE}`);
      console.log(`API is available at: http://localhost:${PORT}`);
    }))
    .catch((error) => {
      console.error('Unable to initialize courses.json:', error.message);
      process.exitCode = 1;
    });
}

module.exports = app;
