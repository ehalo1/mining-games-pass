// 🔗 PASTE YOUR PUBLISHED CSV LINKS HERE
const CSV = {
  students: "PASTE_STUDENTS_CSV_LINK",
  members: "PASTE_TEAMMEMBERS_CSV_LINK",
  schedule: "PASTE_SCHEDULE_CSV_LINK",
  scores: "PASTE_SCORES_CSV_LINK"
};

function parseCSV(text){
  const lines = text.trim().split("\n");
  const headers = lines.shift().split(",").map(h=>h.trim());
  return lines.map(line=>{
    const values = line.split(",");
    const obj = {};
    headers.forEach((h,i)=>obj[h]=values[i] || "");
    return obj;
  });
}

async function fetchCSV(url){
  const text = await fetch(url, { cache: "no-store" }).then(r=>r.text());
  return parseCSV(text);
}

function parseHash(){
  const h = location.hash.replace("#","");
  const i = h.indexOf("-");
  return i>0 ? { id:h.slice(0,i), token:h.slice(i+1) } : null;
}

async function load(){
  const auth = parseHash();
  if(!auth){ alert("Open using your private link"); return; }

  const [students, members, schedule, scores] = await Promise.all([
    fetchCSV(CSV.students),
    fetchCSV(CSV.members),
    fetchCSV(CSV.schedule),
    fetchCSV(CSV.scores)
  ]);

  const me = students.find(s=>s.StudentID===auth.id && s.Token===auth.token);
  if(!me){ alert("Access denied"); return; }

  document.getElementById("name").textContent = me.Name;
  document.getElementById("sid").textContent = me.StudentID;
  document.getElementById("sync").textContent = "Last synced: " + new Date().toLocaleString();

  document.getElementById("qr").innerHTML="";
  new QRCode(document.getElementById("qr"), { text: me.StudentID, width: 220, height: 220 });

  const myTeams = members.filter(m=>m.StudentID===me.StudentID).map(m=>m.TeamID);

  document.getElementById("schedule").innerHTML="";
  schedule.filter(s=>myTeams.includes(s.TeamID))
    .forEach(s=>{
      document.getElementById("schedule").innerHTML +=
        `<li>${s.Date} ${s.Time} – ${s.Activity} @ ${s.Location}</li>`;
    });

  document.getElementById("scores").innerHTML="";
  scores.filter(s=>myTeams.includes(s.TeamID))
    .forEach(s=>{
      document.getElementById("scores").innerHTML +=
        `<li>${s.TeamID} ${s.Item}: ${s.Score}</li>`;
    });
}

document.getElementById("refresh").onclick = load;
load();

