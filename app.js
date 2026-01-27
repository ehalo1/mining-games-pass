// 🔗 Replace these with your REAL published CSV links
const CSV = {
  students: "PASTE_STUDENTS_CSV_LINK",
  members: "PASTE_TEAMMEMBERS_CSV_LINK",
  schedule: "PASTE_SCHEDULE_CSV_LINK",
  scores: "PASTE_SCORES_CSV_LINK"
};

const dbg = (msg) => {
  const el = document.getElementById("debug");
  if (el) el.textContent += msg + "\n";
};

function parseHash(){
  const h = (location.hash || "").replace("#","").trim();
  const i = h.indexOf("-");
  if (i <= 0) return null;
  return { id: h.slice(0,i).trim(), token: h.slice(i+1).trim() };
}

// Robust CSV parser (handles quoted commas)
function parseCSV(text){
  const rows = [];
  let row = [], cell = "", inQuotes = false;

  for (let i=0; i<text.length; i++){
    const ch = text[i];
    const next = text[i+1];

    if (ch === '"' ){
      if (inQuotes && next === '"'){ cell += '"'; i++; }
      else inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && ch === ","){
      row.push(cell); cell = ""; continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")){
      if (ch === "\r" && next === "\n") i++;
      row.push(cell); cell = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      continue;
    }

    cell += ch;
  }

  // last cell
  row.push(cell);
  if (row.length > 1 || row[0] !== "") rows.push(row);

  if (!rows.length) return [];

  const headers = rows.shift().map(h => (h || "").trim());
  return rows.map(r => {
    const o = {};
    headers.forEach((h,idx) => o[h] = (r[idx] ?? "").trim());
    return o;
  });
}

async function fetchCSV(url){
  dbg("Fetching: " + url);
  const res = await fetch(url, { cache: "no-store" });
  dbg("Status: " + res.status);
  const text = await res.text();

  // If it isn't CSV, you'll usually see HTML here
  dbg("First 120 chars: " + text.slice(0,120).replace(/\s+/g," "));

  const data = parseCSV(text);
  dbg("Rows parsed: " + data.length);
  return data;
}

async function load(){
  document.getElementById("debug").textContent = ""; // clear
  const auth = parseHash();

  if(!auth){
    dbg("ERROR: Missing #StudentID-Token in URL.");
    alert("Open using your private link like #STU001-TOKEN");
    return;
  }

  dbg("Auth ID: " + auth.id);
  dbg("Auth Token: " + auth.token);

  const [students, members, schedule, scores] = await Promise.all([
    fetchCSV(CSV.students),
    fetchCSV(CSV.members),
    fetchCSV(CSV.schedule),
    fetchCSV(CSV.scores)
  ]);

  // show first student row keys for sanity
  if (students[0]) dbg("Student columns: " + Object.keys(students[0]).join(", "));

  const me = students.find(s =>
    (s.StudentID || "").trim() === auth.id &&
    (s.Token || "").trim() === auth.token
  );

  if(!me){
    dbg("ERROR: StudentID+Token not found in Students CSV.");
    alert("Access denied (or Students CSV mismatch). Check debug output.");
    return;
  }

  document.getElementById("name").textContent = me.Name || "(No name)";
  document.getElementById("sid").textContent = me.StudentID;
  document.getElementById("sync").textContent = "Last synced: " + new Date().toLocaleString();

  document.getElementById("qr").innerHTML="";
  new QRCode(document.getElementById("qr"), { text: me.StudentID, width: 220, height: 220 });

  const myTeams = members
    .filter(m => (m.StudentID || "").trim() === me.StudentID)
    .map(m => (m.TeamID || "").trim());

  document.getElementById("schedule").innerHTML="";
  schedule
    .filter(s => myTeams.includes((s.TeamID || "").trim()))
    .forEach(s => {
      document.getElementById("schedule").innerHTML +=
        `<li>${s.Date} ${s.Time} – ${s.Activity} @ ${s.Location}</li>`;
    });

  document.getElementById("scores").innerHTML="";
  scores
    .filter(s => myTeams.includes((s.TeamID || "").trim()))
    .forEach(s => {
      document.getElementById("scores").innerHTML +=
        `<li>${s.TeamID} ${s.Item}: ${s.Score}</li>`;
    });

  dbg("SUCCESS: Student loaded.");
}

document.getElementById("refresh").onclick = () => load().catch(e => {
  dbg("FATAL: " + e.message);
  alert("Error. See debug on page.");
});

load().catch(e => {
  dbg("FATAL: " + e.message);
  alert("Error. See debug on page.");
});
