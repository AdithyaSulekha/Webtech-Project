const path = require("path");
const express = require("express");
const fse = require("fs-extra");
const { nanoid } = require("nanoid");

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "change-this-dev-secret";
const JWT_EXPIRES_IN = "2h";

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json({ limit: "256kb" }));

// Serve front-end from the same origin
app.use(express.static(path.join(__dirname, "..", "client")));

// JSON storage
const DB_FILE = process.env.DB_FILE
  ? path.resolve(process.env.DB_FILE)
  : path.join(__dirname, "data", "db.json");

const DEFAULT_DB = { courses: [], sheets: [] };

async function ensureDb() {
  await fse.ensureDir(path.dirname(DB_FILE));
  const exists = await fse.pathExists(DB_FILE);
  if (!exists) {
    await fse.writeJson(DB_FILE, DEFAULT_DB, { spaces: 2 });
  }
}

async function loadDb() {
  try {
    const db = await fse.readJson(DB_FILE);
    return { courses: [], sheets: [], ...db };
  } catch {
    return { ...DEFAULT_DB };
  }
}

async function saveDb(db) {
  await fse.writeJson(DB_FILE, db, { spaces: 2 });
}


function toInt(x, min, max) {
  const n = Number.parseInt(x, 10);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}
function cleanText(s, max = 200) {
  if (typeof s !== "string") return "";
  s = s.replace(/<[^>]*>/g, ""); // strip tags
  s = s.replace(/[^\p{L}\p{N}\s.,:_@\-]/gu, ""); // allow letters/numbers/punct
  return s.trim().slice(0, max);
}
function id8(s) {
  const v = String(s || "").toUpperCase();
  return /^[A-Z0-9]{8}$/.test(v) ? v : null;
}
function bad(res, msg, code = 400) {
  return res.status(code).json({ ok: false, error: msg });
}
function findCourse(db, term, section) {
  return db.courses.find((c) => c.term === term && c.section === section);
}

// JWT helpers
function signToken(user) {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
      memberId: user.memberId || null,
      term: user.term || null,
      section: user.section || null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Auth middleware
function authMiddleware(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return bad(res, "Missing authorization token.", 401);
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { email, role, memberId, term, section, iat, exp }
    next();
  } catch (err) {
    return bad(res, "Invalid or expired token.", 401);
  }
}

// Role check middleware
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return bad(res, "Forbidden.", 403);
    }
    next();
  };
}

// All API routes except /login and /public must have a valid JWT
app.use("/api", (req, res, next) => {
  if (req.path === "/login" || req.path.startsWith("/public/")) {
    return next(); // public endpoints
  }
  return authMiddleware(req, res, next);
});

// Create courses
app.post("/api/courses", async (req, res) => {
  const term = toInt(req.body.term, 1, 9999);
  const section = toInt(req.body.section ?? 1, 1, 99);
  const course = cleanText(req.body.course, 100);
  if (!term || !section || !course)
    return bad(res, "Invalid term/section/course.");

  const db = await loadDb();
  if (findCourse(db, term, section)) {
    return bad(res, `Course term ${term} section ${section} already exists.`);
  }
  db.courses.push({ term, section, course, members: [] });
  await saveDb(db);
  res.json({ ok: true });
});

// List courses
app.get("/api/courses", async (_req, res) => {
  const db = await loadDb();
  const courses = db.courses.map(({ members, ...rest }) => rest);
  res.json({ ok: true, courses });
});

// Delete courses
app.delete("/api/courses", async (req, res) => {
  const term = toInt(req.query.term, 1, 9999);
  const section = toInt(req.query.section ?? 1, 1, 99);
  if (!term || !section) return bad(res, "Invalid term/section.");

  const db = await loadDb();

  // Find all sheets belonging to this course
  const relatedSheets = db.sheets.filter(
    (s) => s.term === term && s.section === section
  );

  // If any sheet exists, deletion must fail.
  if (relatedSheets.length > 0) {
    return bad(res, "Cannot delete course. Course has signup sheets.");
  }

  // Proceed with deletion
  const before = db.courses.length;
  db.courses = db.courses.filter(
    (c) => !(c.term === term && c.section === section)
  );
  
  if (db.courses.length === before)
    return bad(res, "Course not found.", 404);

  await saveDb(db);
  res.json({ ok: true });
});

// Modify courses
app.patch("/api/courses", async (req, res) => {
  const term = toInt(req.body.term, 1, 9999);
  const section = toInt(req.body.section ?? 1, 1, 99);
  const newTerm = toInt(req.body.newTerm, 1, 9999);
  const newSection = toInt(req.body.newSection ?? 1, 1, 99);
  const newName = cleanText(req.body.course, 100);

  const db = await loadDb();
  const course = findCourse(db, term, section);
  if (!course) return bad(res, "Course not found.", 404);

  // If a sheet exists, allow name change ONLY
  const hasSheet = db.sheets.some(s => s.term === term && s.section === section);

  if (hasSheet) {
    if (!newName) return bad(res, "Name required.");
    course.course = newName;
  } else {
    // No sheet → allow term/section/name change
    if (findCourse(db, newTerm, newSection) &&
        !(newTerm === term && newSection === section)) {
      return bad(res, "Course with this term/section already exists.");
    }
    course.term = newTerm;
    course.section = newSection;
    if (newName) course.course = newName;

    // Update sheet references too
    db.sheets.forEach(s => {
      if (s.term === term && s.section === section) {
        s.term = newTerm;
        s.section = newSection;
      }
    });
  }

  await saveDb(db);
  res.json({ ok: true });
});


function normalizeMembers(raw) {
  // If already an array of objects, keep it
  if (Array.isArray(raw)) return raw;

  // If the frontend sent text, try to parse it
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];

    // If user pasted JSON, accept it
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) return j;
    } catch {}

    // Otherwise parse as CSV-ish lines: id, first, last, role
    return s
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [id, first, last, role] = line
          .split(/[,\t;]/)
          .map((v) => v.trim());
        return { id, first, last, role };
      });
  }

  return [];
}

// Add members
app.post("/api/courses/members", async (req, res) => {
  const term = toInt(req.body.term, 1, 9999);
  const section = toInt(req.body.section ?? 1, 1, 99);
  const list = normalizeMembers(req.body.list);

  if (!term || !section) return bad(res, "Invalid term/section.");

  const db = await loadDb();
  const course = findCourse(db, term, section);
  if (!course) return bad(res, "Course not found.", 404);

  const existing = new Set(course.members.map((m) => m.id));
  const added = [],
    ignored = [];

  for (const m of list) {
    const id = id8(m.id);
    const first = cleanText(m.first, 200);
    const last = cleanText(m.last, 200);
    const role = cleanText(m.role, 10);
    if (!id || !first || !last || !role) {
      ignored.push(m.id ?? null);
      continue;
    }
    if (existing.has(id)) {
      ignored.push(id);
      continue;
    }
    course.members.push({ id, first, last, role });
    existing.add(id);
    added.push(id);
  }

  await saveDb(db);
  res.json({
    ok: true,
    added,
    ignored,
    addedCount: added.length,
  });
});

// List members
app.get("/api/courses/members", async (req, res) => {
  const term = toInt(req.query.term, 1, 9999);
  const section = toInt(req.query.section ?? 1, 1, 99);
  // role is optional; empty means "all roles"
  const roleRaw = typeof req.query.role === "string" ? req.query.role : "";
  const role = cleanText(roleRaw, 10);

  if (!term || !section) return bad(res, "Invalid term/section.");

  const db = await loadDb();
  const course = findCourse(db, term, section);
  if (!course) return bad(res, "Course not found.", 404);

  let members = course.members || [];
  if (role) {
    // case-insensitive match
    const r = role.toLowerCase();
    members = members.filter((m) => (m.role || "").toLowerCase() === r);
  }

  res.json({
    ok: true,
    term,
    section,
    role: role || null,
    count: members.length,
    members,
  });
});

// Delete members 
app.delete("/api/courses/members", async (req, res) => {
  const term = toInt(req.query.term, 1, 9999);
  const section = toInt(req.query.section ?? 1, 1, 99);
  const ids = String(req.query.memberIds || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!term || !section || ids.length === 0) {
    return bad(res, "Invalid parameters.");
  }

  const db = await loadDb();
  const course = findCourse(db, term, section);
  if (!course) return bad(res, "Course not found.", 404);

  // Get all sheets for this course
  const sheets = db.sheets.filter(
    (s) => s.term === term && s.section === section
  );

  // Check all slots across all sheets
  for (const sheet of sheets) {
    for (const slot of sheet.slots) {
      for (const signup of slot.members) {
        if (ids.includes(signup.memberId)) {
          return bad(res, "Member has active sign-ups. Deletion failed.");
        }
      }
    }
  }

  // Safe to delete
  const before = course.members.length;
  course.members = course.members.filter((m) => !ids.includes(m.id));
  const removed = before - course.members.length;

  await saveDb(db);

  return res.json({ ok: true, removed });
});

// Create sheet (with duplicate assignment protection)
app.post("/api/sheets", async (req, res) => {
  const term = toInt(req.body.term, 1, 9999);
  const section = toInt(req.body.section ?? 1, 1, 99);
  const assignment = cleanText(req.body.assignment, 100);
  const notBefore = Number.parseInt(req.body.notBefore ?? "0", 10) || 0;
  const notAfter = Number.parseInt(req.body.notAfter ?? "0", 10) || 0;

  if (!term || !section || !assignment)
    return bad(res, "Invalid sheet parameters.");

  const db = await loadDb();
  const courseObj = findCourse(db, term, section);
  if (!courseObj)
    return bad(res, "Course not found.", 404);

  // Reject duplicate assignment names for the same course
  const exists = db.sheets.some(
    s =>
      s.term === term &&
      s.section === section &&
      s.assignment.toLowerCase() === assignment.toLowerCase()
  );

  if (exists) {
    return bad(res, "Signup sheet with this assignment already exists.");
  }

  // Create sheet
  const id = nanoid(8);
  db.sheets.push({
    id,
    term,
    section,
    course: courseObj.course,
    assignment,
    notBefore,
    notAfter,
    slots: [],
  });

  await saveDb(db);
  res.json({ ok: true, id });
});

// Delete sheet (block deletion if sign-ups exist)
app.delete("/api/sheets/:id", async (req, res) => {
  const db = await loadDb();
  const sheet = db.sheets.find((s) => s.id === req.params.id);

  if (!sheet) return bad(res, "Sheet not found.", 404);

  // Cannot delete sheet if ANY slot has sign-ups
  const hasSignups = sheet.slots.some(
    slot => Array.isArray(slot.members) && slot.members.length > 0
  );

  if (hasSignups) {
    return bad(res, "Cannot delete sheet. It has slots with sign-ups.");
  }

  // Safe deletion
  db.sheets = db.sheets.filter((s) => s.id !== req.params.id);

  await saveDb(db);
  res.json({ ok: true });
});


// List sheets for a course
app.get("/api/sheets", async (req, res) => {
  const term = toInt(req.query.term, 1, 9999);
  const section = toInt(req.query.section ?? 1, 1, 99);
  if (!term || !section) return bad(res, "Invalid term/section.");
  const db = await loadDb();
  res.json({
    ok: true,
    sheets: db.sheets.filter((s) => s.term === term && s.section === section),
  });
});

// Add slots (with overlap check)
app.post("/api/sheets/:id/slots", async (req, res) => {
  const start = Number.parseInt(req.body.start, 10);
  const duration = toInt(req.body.duration, 1, 240);
  const numSlots = toInt(req.body.numSlots, 1, 99);
  const maxMembers = toInt(req.body.maxMembers, 1, 99);

  if (!Number.isFinite(start) || !duration || !numSlots || !maxMembers) {
    return bad(res, "Invalid slot parameters.");
  }

  const db = await loadDb();
  const sheet = db.sheets.find((s) => s.id === req.params.id);
  if (!sheet) return bad(res, "Sheet not found.", 404);

  // Ensure slots array exists
  sheet.slots = sheet.slots || [];

  const slotLengthMs = duration * 60000;

  // Build the new slot ranges we want to add
  const newRanges = [];
  for (let i = 0; i < numSlots; i++) {
    const s = start + i * slotLengthMs;
    const e = s + slotLengthMs;
    newRanges.push({ start: s, end: e });
  }

  // Build existing slot ranges
  const existingRanges = sheet.slots.map((sl) => {
    const dMs = (sl.duration || 0) * 60000;
    return {
      start: sl.start,
      end: sl.start + dMs,
    };
  });

  // Overlap check: [a.start, a.end) overlaps [b.start, b.end) if:
  // a.start < b.end && a.end > b.start
  for (const nr of newRanges) {
    for (const er of existingRanges) {
      if (nr.start < er.end && nr.end > er.start) {
        return bad(res, "Slot times overlap with existing slots.");
      }
    }
  }

  // If we get here, it's safe to add the slots
  const created = [];
  for (let i = 0; i < numSlots; i++) {
    const s = start + i * slotLengthMs;
    const slot = {
      id: nanoid(10),
      start: s,
      duration,
      capacity: maxMembers,
      members: [],
    };
    sheet.slots.push(slot);
    created.push(slot.id);
  }

  await saveDb(db);
  res.json({ ok: true, created });
});


// List slots for a sheet
app.get("/api/sheets/:id/slots", async (req, res) => {
  const db = await loadDb();
  const sheet = db.sheets.find((s) => s.id === req.params.id);
  if (!sheet) return bad(res, "Sheet not found.", 404);
  res.json({ ok: true, slots: sheet.slots });
});

// Modify a slot (start/duration/capacity) WITH overlap & signup count checks
app.patch("/api/slots/:slotId", async (req, res) => {
  const db = await loadDb();

  // Locate sheet + slot
  let sheet = null;
  let slot = null;

  for (const s of db.sheets) {
    const found = s.slots.find(sl => sl.id === req.params.slotId);
    if (found) {
      sheet = s;
      slot = found;
      break;
    }
  }

  if (!slot || !sheet) return bad(res, "Slot not found.", 404);

  // Parse new values properly
  const startRaw = req.body.start;
  const durationRaw = req.body.duration;
  const capacityRaw = req.body.capacity;

  const newStart =
    startRaw !== undefined ? Number(startRaw) : slot.start;

  const newDuration =
    durationRaw !== undefined ? Number(durationRaw) : slot.duration;

  const newCapacity =
  capacityRaw !== undefined && capacityRaw !== null && capacityRaw !== ""
    ? Number(capacityRaw)
    : slot.capacity;

  if (!Number.isFinite(newStart)) return bad(res, "Invalid start.");
  if (!Number.isFinite(newDuration) || newDuration < 1)
    return bad(res, "Invalid duration.");
  if (!Number.isFinite(newCapacity) || newCapacity < 1)
    return bad(res, "Invalid capacity.");

  const newEnd = newStart + newDuration * 60000;

  // SIGNUP COUNT CHECK
  const signupCount = Array.isArray(slot.members)
    ? slot.members.filter((m) => m && m.memberId).length
    : 0;
  if (newCapacity < signupCount) {
    return bad(
      res,
      `Capacity too small. This slot has ${signupCount} sign-ups.`
    );
  }

  // OVERLAP CHECK
  for (const other of sheet.slots) {
    if (other.id === slot.id) continue;

    const otherStart = other.start;
    const otherEnd = other.start + other.duration * 60000;

    if (newStart < otherEnd && newEnd > otherStart) {
      return bad(res, "New slot time overlaps with another slot.");
    }
  }

  // SAFE UPDATE
  slot.start = newStart;
  slot.duration = newDuration;
  slot.capacity = newCapacity;

  await saveDb(db);

  return res.json({
    ok: true,
    slot: {
      id: slot.id,
      start: slot.start,
      duration: slot.duration,
      capacity: slot.capacity,
      memberIds: slot.members.map(m => m.memberId),
    },
  });
});

// Delete a slot ONLY if it has NO sign-ups
app.delete("/api/slots/:slotId", async (req, res) => {
  const db = await loadDb();
  const slotId = req.params.slotId;

  let sheet = null;
  let slot = null;

  // Find sheet + slot
  for (const s of db.sheets) {
    const found = s.slots.find(sl => sl.id === slotId);
    if (found) {
      sheet = s;
      slot = found;
      break;
    }
  }

  if (!sheet || !slot) {
    return bad(res, "Slot not found.", 404);
  }

  // If slot has ANY sign-ups, deletion must FAIL
  if (Array.isArray(slot.members) && slot.members.length > 0) {
    return bad(res, "Cannot delete slot. It has existing sign-ups.");
  }

  // SAFE DELETE
  sheet.slots = sheet.slots.filter(sl => sl.id !== slotId);

  await saveDb(db);

  return res.json({ ok: true });
});


// Sign up
app.post("/api/signups", async (req, res) => {
  const sheetId = cleanText(req.body.sheetId, 20);
  const slotId = cleanText(req.body.slotId, 20);
  const memberId = id8(req.body.memberId);
  if (!sheetId || !slotId || !memberId)
    return bad(res, "Invalid signup parameters.");

  const db = await loadDb();
  const sheet = db.sheets.find((s) => s.id === sheetId);
  if (!sheet) return bad(res, "Sheet not found.", 404);

  const slot = sheet.slots.find((s) => s.id === slotId);
  if (!slot) return bad(res, "Slot not found.", 404);

  const course = findCourse(db, sheet.term, sheet.section);
  if (!course || !course.members.some((m) => m.id === memberId)) {
    return bad(res, "Member not in course.");
  }
  const already = sheet.slots.some((s) =>
    s.members.some((m) => m.memberId === memberId)
  );
  if (already) return bad(res, "Member already signed up.");
  if (slot.members.length >= slot.capacity) return bad(res, "Slot is full.");

  slot.members.push({ memberId, comment: "", grade: null, finalGrade: null, gradedTime: null });
  await saveDb(db);
  res.json({ ok: true });
});

// Remove signup
app.delete("/api/signups", async (req, res) => {
  const sheetId = cleanText(req.query.sheetId, 20);
  const memberId = id8(req.query.memberId);

  if (!sheetId || !memberId) {
    return bad(res, "Invalid parameters.");
  }

  const db = await loadDb();
  const sheet = db.sheets.find((s) => s.id === sheetId);
  if (!sheet) return bad(res, "Sheet not found.");

  const now = Date.now();
  let removed = false;

  for (const slot of sheet.slots) {
    const memberInSlot = slot.members.some((m) => m.memberId === memberId);

    if (memberInSlot) {
      // Enforce 2-hour rule
      if (slot.start - now < 2 * 60 * 60 * 1000) {
        return bad(res, "Cannot leave. Slot starts in less than 2 hours.");
      }

      // Remove the member
      slot.members = slot.members.filter((m) => m.memberId !== memberId);
      removed = true;
    }
  }

  if (!removed) {
    return bad(res, "Member is not signed up for any slot in this sheet.");
  }

  await saveDb(db);
  return res.json({ ok: true });
});

// List members of a slot
app.get("/api/slots/:slotId/members", async (req, res) => {
  const db = await loadDb();
  const slot = db.sheets
    .flatMap((s) => s.slots)
    .find((x) => x.id === req.params.slotId);
  if (!slot) return bad(res, "Slot not found.", 404);
  res.json({ ok: true, members: slot.members });
});

// Grade / append comment
app.post("/api/grades", async (req, res) => {
  const sheetId = cleanText(req.body.sheetId, 20);
  const memberId = id8(req.body.memberId);
  const grade = toInt(req.body.grade, 0, 999);
  const bonus = toInt(req.body.bonus, -999, 999);
  const penalty = toInt(req.body.penalty, -999, 999);
  const newComment = cleanText(req.body.comment, 500);

  if (!sheetId || !memberId || grade === null) {
    return bad(res, "Invalid grade parameters.");
  }

  const db = await loadDb();
  const sheet = db.sheets.find((s) => s.id === sheetId);
  if (!sheet) return bad(res, "Sheet not found.", 404);

  const slot = sheet.slots.find((s) =>
    s.members.some((m) => m.memberId === memberId)
  );
  if (!slot) return bad(res, "Member not signed up.", 404);

  const m = slot.members.find((x) => x.memberId === memberId);
  const timestamp = Date.now();

  // Determine if any field was modified
  const changed =
    m.grade !== grade ||
    (m.bonus ?? 0) !== (bonus ?? 0) ||
    (m.penalty ?? 0) !== (penalty ?? 0);

  // Require new comment for any modification
  if (changed && (!newComment || newComment.trim() === "")) {
    return bad(res, "A comment is required when modifying a grade.");
  }

  // Prepare new final grade
  const finalGrade = grade + (bonus ?? 0) - (penalty ?? 0);

  // Store values
  m.grade = grade;
  m.bonus = bonus ?? 0;
  m.penalty = penalty ?? 0;
  m.finalGrade = finalGrade;
  m.gradedTime = timestamp;

  // Build comment history
  const oldComment = m.comment ?? "";
  if (newComment.trim() !== "") {
    m.comment = oldComment
      ? oldComment + "\n" + newComment.trim()
      : newComment.trim();
  }

  await saveDb(db);

  res.json({
    ok: true,
    memberId,
    grade,
    bonus: m.bonus,
    penalty: m.penalty,
    finalGrade,
    comment: m.comment,
    gradedTime: timestamp,
  });
});


// LOGIN
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const db = await loadDb();
  const user = db.users.find((u) => u.email === email);

  if (!user) return bad(res, "Email not found.");

  // Compare plain password with hashed
  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return bad(res, "Incorrect password.");

  const token = signToken(user);

  return res.json({
    ok: true,
    email: user.email,
    role: user.role || "STUDENT",
    firstLogin: user.firstLogin,
    memberId: user.memberId || null,
    term: user.term || null,
    section: user.section || null,
    token
  });
});

// CHANGE PASSWORD
app.post("/api/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const email = req.user.email;

  const db = await loadDb();
  const user = db.users.find((u) => u.email === email);

  if (!user) return bad(res, "User not found.");

  // verify old password
  const ok = bcrypt.compareSync(currentPassword, user.password);
  if (!ok) return bad(res, "Current password is incorrect.");

  // store new hashed password
  user.password = bcrypt.hashSync(newPassword, 10);
  user.firstLogin = false;

  await saveDb(db);
  return res.json({ ok: true });
});

// PUBLIC SEARCH: by course code
app.get("/api/public/search", async (req, res) => {
  const course = (req.query.course || "").toString().toLowerCase().trim();
  if (!course) return bad(res, "Missing search term.");

  const db = await loadDb();

  const sheets = db.sheets.filter(s =>
    s.course.toLowerCase().includes(course)
  );

  res.json({
    ok: true,
    sheets: sheets.map(s => ({
      id: s.id,
      course: s.course,
      description: s.description || ""
    }))
  });
});

app.post("/api/courses/members/csv", upload.single("csv"), async (req, res) => {
  const term = toInt(req.body.term, 1, 9999);
  const section = toInt(req.body.section ?? 1, 1, 99);

  if (!term || !section) return bad(res, "Invalid term/section.");

  if (!req.file) return bad(res, "CSV file required.");

  const db = await loadDb();
  const course = findCourse(db, term, section);
  if (!course) return bad(res, "Course not found.", 404);

  const text = req.file.buffer.toString("utf8").trim();
  const lines = text.split(/\r?\n/);

  const existing = new Set(course.members.map((m) => m.id));
  const added = [];
  const ignored = [];

  for (const line of lines) {
    const parts = line.split(",").map((s) => s.trim());
    if (parts.length !== 4) {
      ignored.push(line);
      continue;
    }

    const [last, first, username, password] = parts;

    const id = id8(username);
    if (!id || existing.has(id)) {
      ignored.push(username);
      continue;
    }

    course.members.push({
      id,
      first,
      last,
      role: "student",
      password,
    });

    existing.add(id);
    added.push(id);
  }

  await saveDb(db);

  res.json({
    ok: true,
    added,
    ignored,
    addedCount: added.length,
  });
});

// Get current active slot
app.get("/api/current", async (req, res) => {
  const db = await loadDb();
  const now = Date.now();

  // Loop all courses first
  for (const course of db.courses) {

    // Find sheets belonging to THIS course
    const matchingSheets = db.sheets.filter(s =>
      s.term === course.term &&
      s.section === course.section &&
      s.course?.toLowerCase() === course.course?.toLowerCase()
    );

    if (matchingSheets.length === 0) continue;

    // Check each sheet in this course
    for (const sheet of matchingSheets) {
      let slotIndex = 0;

      for (const slot of sheet.slots) {
        slotIndex++;

        const start = Number(slot.start);
        if (!Number.isFinite(start)) continue;

        const end = start + slot.duration * 60000;

        // If NOW is inside the slot
        if (now >= start && now <= end) {

          // Build member list with names
          const members = slot.members.map(m => {
            const u = course.members.find(x => x.id === m.memberId);

            return {
              memberId: m.memberId,
              first: u?.first || "",
              last: u?.last || "",
              grade: m.grade ?? null,
              finalGrade: m.finalGrade ?? null,
              bonus: m.bonus ?? 0,
              penalty: m.penalty ?? 0,
              comment: m.comment ?? "",
              gradedTime: m.gradedTime ?? null,
              audit: m.audit ?? null
            };
          });

          return res.json({
            ok: true,
            sheetId: sheet.id,
            assignment: sheet.assignment,
            slotId: slot.id,
            slotNumber: slotIndex,
            slotStart: start,
            slotEnd: end,
            duration: slot.duration,
            members
          });
        }
      }
    }
  }

  return bad(res, "No active slot at this time.", 404);
});


// Helper to locate sheet + slot by slotId
function findSlotById(db, slotId) {
  for (const sheet of db.sheets) {
    const index = sheet.slots.findIndex(sl => sl.id === slotId);
    if (index !== -1) {
      return { sheet, index, slot: sheet.slots[index] };
    }
  }
  return null;
}

// Get NEXT slot
app.get("/api/slot/next", async (req, res) => {
  const slotId = req.query.slotId;
  if (!slotId) return bad(res, "Missing slotId.");

  const db = await loadDb();
  const result = findSlotById(db, slotId);
  if (!result) return bad(res, "Slot not found.", 404);

  const { sheet, index } = result;

  if (index + 1 >= sheet.slots.length) {
    return bad(res, "No next slot.", 404);
  }

  const next = sheet.slots[index + 1];

  const course = db.courses.find(
    (c) => c.term === sheet.term && c.section === sheet.section
  );

  return res.json({
    ok: true,
    sheetId: sheet.id,
    assignment: sheet.assignment,
    slotId: next.id,
    slotNumber: index + 2,
    slotStart: next.start,
    slotEnd: next.start + next.duration * 60000,
    duration: next.duration,
    members: next.members.map((m) => {
      const u = course.members.find((x) => x.id === m.memberId);
      return {
        memberId: m.memberId,
        first: u?.first || "",
        last: u?.last || "",
        grade: m.grade ?? null,
        finalGrade: m.finalGrade ?? null,
        comment: m.comment ?? "",
        gradedTime: m.gradedTime ?? null,
      };
    }),
  });
});

// Get PREVIOUS slot
app.get("/api/slot/prev", async (req, res) => {
  const slotId = req.query.slotId;
  if (!slotId) return bad(res, "Missing slotId.");

  const db = await loadDb();
  const result = findSlotById(db, slotId);
  if (!result) return bad(res, "Slot not found.", 404);

  const { sheet, index } = result;

  if (index === 0) {
    return bad(res, "No previous slot.", 404);
  }

  const prev = sheet.slots[index - 1];

  const course = db.courses.find(
    (c) => c.term === sheet.term && c.section === sheet.section
  );

  return res.json({
    ok: true,
    sheetId: sheet.id,
    assignment: sheet.assignment,
    slotId: prev.id,
    slotNumber: index,
    slotStart: prev.start,
    slotEnd: prev.start + prev.duration * 60000,
    duration: prev.duration,
    members: prev.members.map((m) => {
      const u = course.members.find((x) => x.id === m.memberId);
      return {
        memberId: m.memberId,
        first: u?.first || "",
        last: u?.last || "",
        grade: m.grade ?? null,
        finalGrade: m.finalGrade ?? null,
        comment: m.comment ?? "",
        gradedTime: m.gradedTime ?? null,
      };
    }),
  });
});

// Unified grading update endpoint WITH AUDIT LOGGING
app.post("/api/grades/update", async (req, res) => {
  const sheetId = cleanText(req.body.sheetId, 20);
  const memberId = id8(req.body.memberId);
  const changedBy = cleanText(req.body.changedBy, 200);

  if (!sheetId || !memberId) return bad(res, "Invalid parameters.");

  const db = await loadDb();
  const sheet = db.sheets.find((s) => s.id === sheetId);
  if (!sheet) return bad(res, "Sheet not found.", 404);

  const slot = sheet.slots.find((sl) =>
    sl.members.some((m) => m.memberId === memberId)
  );
  if (!slot) return bad(res, "Member not signed up.", 404);

  const m = slot.members.find((x) => x.memberId === memberId);
  if (!m) return bad(res, "Member data missing.", 404);

  const now = Date.now();

  // Store old values for audit
  const old = {
    grade: m.grade ?? null,
    bonus: m.bonus ?? 0,
    penalty: m.penalty ?? 0,
  };

  // Apply updates
  if (req.body.grade !== undefined && req.body.grade !== null) {
    const g = toInt(req.body.grade, 0, 999);
    if (g === null) return bad(res, "Invalid grade.");
    m.grade = g;
  }

  if (req.body.bonus !== undefined && req.body.bonus !== null) {
    const b = toInt(req.body.bonus, -50, 50);
    if (b === null) return bad(res, "Invalid bonus.");
    m.bonus = b;
  }

  if (req.body.penalty !== undefined && req.body.penalty !== null) {
    const p = toInt(req.body.penalty, -50, 50);
    if (p === null) return bad(res, "Invalid penalty.");
    m.penalty = p;
  }

  // Update comment
  if (typeof req.body.comment === "string") {
    const newComment = cleanText(req.body.comment, 500).trim();
    const oldComment = m.comment ?? "";
    if (newComment) {
      m.comment = oldComment ? oldComment + "\n" + newComment : newComment;
    }
  }

  // Recalculate final grade
  const base = m.grade ?? 0;
  const bonus = m.bonus ?? 0;
  const penalty = m.penalty ?? 0;
  m.finalGrade = base + bonus - penalty;
  m.gradedTime = now;

  // Create audit entry (LAST ONLY)
  m.audit = {
    time: Date.now(),
    changedBy: req.user?.email || req.body?.changedBy || "unknown",
    oldGrade: old.grade,
    oldBonus: old.bonus,
    oldPenalty: old.penalty,
    newGrade: m.grade,
    newBonus: m.bonus,
    newPenalty: m.penalty,
    commentAdded: req.body.comment || ""
  };

  await saveDb(db);

  res.json({
    ok: true,
    sheetId,
    memberId,
    grade: m.grade,
    bonus: m.bonus,
    penalty: m.penalty,
    finalGrade: m.finalGrade,
    comment: m.comment,
    gradedTime: now,
    audit: {
      time: m.audit.time,
      changedBy: m.audit.changedBy,
      oldGrade: m.audit.oldGrade,
      newGrade: m.audit.newGrade,
      oldBonus: m.audit.oldBonus,
      newBonus: m.audit.newBonus,
      oldPenalty: m.audit.oldPenalty,
      newPenalty: m.audit.newPenalty,
      commentAdded: m.audit.commentAdded,
    },
  });
});

// GET all users
app.get("/api/users", async (req, res) => {
  const db = await loadDb();
  res.json({ ok: true, users: db.users ?? [] });
});

// Admin: Add user WITH member mapping
app.post("/api/admin/add-user", requireRole("ADMIN"), async (req, res) => {
  const { email, password, role, memberId, term, section } = req.body;

  if (!email || !password)
    return bad(res, "Email and password required.");

  if (!["TA", "STUDENT", "ADMIN"].includes(role))
    return bad(res, "Invalid role.");

  const db = await loadDb();

  if (db.users.some(u => u.email === email)) {
    return bad(res, "User already exists.");
  }

  // For STUDENTS: memberId + course required
  if (role === "STUDENT") {
    if (!memberId || !term || !section)
      return bad(res, "Student requires memberId, term and section.");
  }

  db.users.push({
    email,
    password: bcrypt.hashSync(password, 10),
    role,
    firstLogin: true,
    memberId: role === "STUDENT" ? memberId.toUpperCase() : null,
    term: role === "STUDENT" ? Number(term) : null,
    section: role === "STUDENT" ? Number(section) : null
  });

  await saveDb(db);
  res.json({ ok: true });
});


// Admin: Remove user
app.delete("/api/admin/remove-user", requireRole("ADMIN"), async (req, res) => {
  const email = String(req.query.email || "").trim();

  const db = await loadDb();

  if (!email) return bad(res, "Invalid email.");
  if (email === "admin@site.com") return bad(res, "Cannot delete ADMIN.");

  const before = db.users.length;

  db.users = db.users.filter(u => u.email !== email);

  if (db.users.length === before)
    return bad(res, "User not found.");

  await saveDb(db);

  res.json({ ok: true });
});

// Admin: Reset user password
app.post("/api/admin/reset-password", requireRole("ADMIN"), async (req, res) => {
  const { email, newPassword } = req.body;

  const db = await loadDb();
  const user = db.users.find(u => u.email === email);

  if (!user) return bad(res, "User not found.");

  user.password = bcrypt.hashSync(newPassword, 10);
  user.firstLogin = true;

  await saveDb(db);

  res.json({ ok: true });
});


// ---------------------- START ----------------------
(async function start() {
  await ensureDb();
  const multer = require("multer");
  const upload = multer({ storage: multer.memoryStorage() });
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`Server running at http://localhost:${PORT}`)
  );
})();
