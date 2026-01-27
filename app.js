const PUBLISHED_LINK = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQrBwCIn3nyOCbNkYgGjnWOiHI6utpiQk9NDRX9gySo-JXqim5a5T0Nr5sdA_Ool3d0tII7Q8FnoNhZ/pubhtml";

function getPubId(url){
  const m = url.match(/\/d\/e\/([^/]+)\/pubhtml/);
  return m ? m[1] : null;
}
const PUB_ID = getPubId(PUBLISHED_LINK);

function gviz(sheet){
  return `https://docs.google.com/spreadsheets/d/e/${PUB_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}`;
}

async function fetchSheet(sheet){
  const txt = await fetch(gviz(sheet)).then(r=>r.text());
  const json = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}")+1));
  const headers = json.table.cols.map(c=>c.label);
  return json.table.rows.map(r=>{
    const o = {};
    r.c.forEach((c,i)=>o[headers[i]] = c ? c.v : "");
    return o;
  });
}

function parseHash(){
  const h = location.hash.replace("#","");
  const i = h.indexOf("-");
  return i>0 ? { id:h.slice(0,i), token:h.slice(i+1) } : null;
}

async function load(){
  const auth = parseHash();
  if(!auth){ alert("Open with your private link"); return; }

  const [students, members, schedule, scores] = await Promise.all([
    fetchSheet("Students"),
    fetchSheet("TeamMembers"),
    fetchSheet("Schedule"),
    fetchSheet("Scores")
  ]);

  const me = students.find(s=>s.StudentID==auth.id && s.Token==auth.token);
  if(!me){ alert("Access denied"); return; }

  document.getElementById("name").textContent = me.Name;
  document.getElementById("sid").textContent = me.StudentID;
  document.getElementById("sync").textContent = "Last synced: " + new Date().toLocaleString();

  document.getElementById("qr").innerHTML="";
  new QRCode(document.getElementById("qr"), { text: me.StudentID, width: 220, height: 220 });

  const myTeams = members.filter(m=>m.StudentID==me.StudentID).map(m=>m.TeamID);

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

