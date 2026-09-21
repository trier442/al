import dns from "node:dns";dns.setDefaultResultOrder("ipv4first");
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");
async function req(url){const r=await fetch(url,{headers:{Authorization:auth,"Connection":"close"},signal:AbortSignal.timeout(45000)});const t=await r.text();if(!r.ok)throw new Error(r.status+" "+t.slice(0,300));return t?JSON.parse(t):{};}
for(const status of ["publish","future","draft","pending","private","trash"]){
 try{
  const rows=await req(base+`/wp-json/wp/v2/posts?context=edit&status=${status}&categories=26&per_page=100&orderby=id&order=asc`);
  console.log("STATE",status,JSON.stringify(rows.map(x=>({id:x.id,slug:x.slug,title:String(x.title?.rendered||"").replace(/<[^>]+>/g,""),date:x.date,status:x.status,link:x.link,guid:x.guid?.rendered}))));
 }catch(e){console.log("STATE_FAIL",status,e.message)}
}

// state check after revised publish retry 2026-09-21T13:23Z

// front-link verification
try{
  const pubs=await req(base+"/wp-json/wp/v2/posts?context=edit&status=publish&categories=26&per_page=100&orderby=id&order=asc");
  const checks=[];
  for(const x of pubs){
    let code=0,finalUrl="",err="";
    try{const r=await fetch(x.link,{redirect:"follow",headers:{"User-Agent":"Mozilla/5.0","Connection":"close"},signal:AbortSignal.timeout(20000)});code=r.status;finalUrl=r.url;}catch(e){err=e.message;}
    checks.push({id:x.id,slug:x.slug,link:x.link,code,finalUrl,err});
  }
  console.log("FRONT_CHECKS",JSON.stringify(checks));
}catch(e){console.log("FRONT_CHECKS_FAIL",e.message)}
