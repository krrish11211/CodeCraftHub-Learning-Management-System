'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Tests never write to the real courses.json file.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codecrafthub-ibm-'));
process.env.CODECRAFTHUB_DATA_FILE = path.join(dir, 'courses.json');
const app = require('../app');

async function withServer(run) {
  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    return await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('Auto-creates JSON file, returns empty list', async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/courses`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
    assert.equal(fs.existsSync(process.env.CODECRAFTHUB_DATA_FILE), true);
  });
});

test('Validates missing fields, invalid status and invalid dates', async () => {
  await withServer(async (url) => {
    for (const body of [
      { name: 'Bad' },
      { name: 'Course', description: 'Good', target_date: '2026-12-12', status: 'Wrong' },
      { name: 'Course', description: 'Good', target_date: '2026-02-30', status: 'Not Started' }
    ]) {
      const res = await fetch(`${url}/api/courses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      assert.equal(res.status, 400);
      assert.ok((await res.json()).error);
    }
  });
});

test('Creates, reads, partially updates, and deletes a course', async () => {
  await withServer(async (url) => {
    const createRes = await fetch(`${url}/api/courses`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Python Basics', description: 'Learn fundamentals', target_date: '2026-12-31', status: 'Not Started' })
    });
    assert.equal(createRes.status, 201);
    const { course } = await createRes.json();
    assert.equal(course.id, 1);
    assert.match(course.created_at, /^\d{4}-\d{2}-\d{2}T/);

    let res = await fetch(`${url}/api/courses/1`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).name, 'Python Basics');

    res = await fetch(`${url}/api/courses/1`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'In Progress' })
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).course.status, 'In Progress');

    res = await fetch(`${url}/api/courses/1`, { method: 'DELETE' });
    assert.equal(res.status, 200);
    res = await fetch(`${url}/api/courses/1`);
    assert.equal(res.status, 404);
  });
});

test('404 for missing courses', async () => {
  await withServer(async (url) => {
    for (const method of ['GET', 'DELETE']) {
      const response = await fetch(`${url}/api/courses/999`, { method });
      assert.equal(response.status, 404);
    }
  });
});

test.after(() => { fs.rmSync(dir, { recursive: true, force: true }); });
