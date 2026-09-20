const complaints = [
  {title:"Ceiling fan not working",category:"Electrical",location:"Block A · Room 204",status:"In Progress",priority:"High",time:"Today, 9:12 AM"},
  {title:"Wi-Fi signal weak",category:"Wi-Fi / Network",location:"Library · 2nd Floor",status:"Submitted",priority:"Normal",time:"Yesterday, 4:35 PM"},
  {title:"Water leakage near washroom",category:"Plumbing",location:"Hostel A · 1st Floor",status:"Resolved",priority:"Normal",time:"12 Sep, 11:20 AM"},
  {title:"Tube light flickering",category:"Electrical",location:"ECE Block · Lab 2",status:"In Progress",priority:"Normal",time:"11 Sep, 2:10 PM"},
  {title:"Broken classroom chair",category:"Classroom",location:"Block B · Room 108",status:"Resolved",priority:"Normal",time:"09 Sep, 10:05 AM"}
];

const icons = {Electrical:"⚡","Wi-Fi / Network":"◉",Plumbing:"◒",Classroom:"▣",Hostel:"⌂",Other:"•"};

function complaintHTML(c){
  const cls = c.status==="Resolved"?"resolved":c.status==="In Progress"?"progress":"submitted";
  return `<div class="complaint">
    <div class="category-icon">${icons[c.category]||"•"}</div>
    <div class="complaint-main"><b>${escapeHTML(c.title)}</b><small>${escapeHTML(c.category)} · ${escapeHTML(c.location)} · ${escapeHTML(c.time)}</small></div>
    ${c.priority==="High"||c.priority==="Urgent"?'<span class="status" style="background:#ffeded;color:#df5d5d;margin-right:7px">HIGH</span>':""}
    <span class="status ${cls}">${escapeHTML(c.status)}</span>
  </div>`;
}

function renderRecent(){document.getElementById("recent-list").innerHTML=complaints.slice(0,4).map(complaintHTML).join("");}
function renderAll(){
  const q=(document.getElementById("search").value||"").toLowerCase();
  const filter=document.getElementById("statusFilter").value;
  const data=complaints.filter(c=>(!q || `${c.title} ${c.category} ${c.location}`.toLowerCase().includes(q)) && (filter==="All Status"||c.status===filter));
  document.getElementById("all-list").innerHTML=data.length?data.map(complaintHTML).join(""):`<div style="padding:35px;text-align:center;color:#98a2b3;font-size:12px">No complaints found.</div>`;
}

function showPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active-page"));
  document.getElementById(page).classList.add("active-page");
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===page));
  const titles={dashboard:"Good morning 👋",raise:"Raise a new complaint",complaints:"My complaints",map:"Campus fault map"};
  document.getElementById("page-title").textContent=titles[page];
  window.scrollTo({top:0,behavior:"smooth"});
  if(page==="complaints")renderAll();
}

document.querySelectorAll(".nav-item").forEach(n=>n.addEventListener("click",()=>showPage(n.dataset.page)));
document.getElementById("search").addEventListener("input",renderAll);
document.getElementById("statusFilter").addEventListener("change",renderAll);

document.getElementById("complaintForm").addEventListener("submit",e=>{
  e.preventDefault();
  const c={
    title:document.getElementById("title").value,
    category:document.getElementById("category").value,
    location:document.getElementById("location").value,
    status:"Submitted",
    priority:document.getElementById("priority").value,
    time:"Just now"
  };
  complaints.unshift(c);
  document.getElementById("complaintForm").reset();
  document.getElementById("totalCount").textContent=complaints.length;
  renderRecent(); renderAll(); showToast();
  showPage("complaints");
});

function showToast(){
  const t=document.getElementById("toast");t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2600);
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
renderRecent(); renderAll();
