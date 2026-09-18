import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
const required=["WP_URL","WP_USERNAME","WP_APP_PASSWORD"];
for(const k of required){if(!process.env[k]) throw new Error(k+" missing");}
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");

async function j(url){
  let last;
  for(let i=1;i<=4;i++){
    try{
      const r=await fetch(url,{headers:{Authorization:auth,"Connection":"close"},signal:AbortSignal.timeout(30000)});
      const t=await r.text();
      let d={}; try{d=t?JSON.parse(t):{};}catch{d={raw:t.slice(0,500)}}
      return {status:r.status,ok:r.ok,data:d};
    }catch(e){last=e; console.log("retry",i,url.replace(base,"[BASE]"),e.message);}
  }
  return {status:0,ok:false,error:last?.message||String(last)};
}
async function front(url){
  let last;
  for(let i=1;i<=3;i++){
    try{
      const r=await fetch(url,{redirect:"manual",headers:{"Connection":"close","User-Agent":"Mozilla/5.0"},signal:AbortSignal.timeout(30000)});
      return {status:r.status,location:r.headers.get("location")||"",url:r.url};
    }catch(e){last=e;}
  }
  return {status:0,error:last?.message||String(last)};
}
const ids=[3265];
for(const id of ids){
 const r=await j(base+"/wp-json/wp/v2/posts/"+id+"?context=edit");
 if(!r.ok){console.log("ID",id,"REST",r.status,r.data?.code||"",r.data?.message||r.error||"");continue;}
 const p=r.data;
 const f=await front(p.link);
 console.log("ID",id,JSON.stringify({status:p.status,slug:p.slug,title:p.title?.rendered,link:p.link,front:f}));
}
const searches=[];
for(const q of searches){
 const r=await j(base+"/wp-json/wp/v2/posts?context=edit&per_page=20&search="+encodeURIComponent(q));
 if(!r.ok){console.log("SEARCH",q,"REST",r.status,r.data?.message||r.error||"");continue;}
 console.log("SEARCH",q,JSON.stringify(r.data.map(p=>({id:p.id,status:p.status,slug:p.slug,title:p.title?.rendered,link:p.link}))));
}


function xesc(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");}
async function xmlrpcPublish(id){
  const body=`<?xml version="1.0"?><methodCall><methodName>wp.editPost</methodName><params><param><value><int>1</int></value></param><param><value><string>${xesc(process.env.WP_USERNAME)}</string></value></param><param><value><string>${xesc(process.env.WP_APP_PASSWORD.replace(/\\s/g,""))}</string></value></param><param><value><int>${id}</int></value></param><param><value><struct><member><name>post_status</name><value><string>publish</string></value></member></struct></value></param></params></methodCall>`;
  const r=await fetch(base+"/xmlrpc.php",{method:"POST",headers:{"Content-Type":"text/xml","Connection":"close"},body,signal:AbortSignal.timeout(30000)});
  const t=await r.text();
  console.log("XMLRPC_PUBLISH",id,"HTTP",r.status,t.slice(0,600).replace(/\\s+/g," "));
}
await xmlrpcPublish(3265);
const xr=await j(base+"/wp-json/wp/v2/posts/3265?context=edit");
if(xr.ok){
  const p=xr.data; const f=await front(p.link);
  console.log("AFTER_XMLRPC_3265",JSON.stringify({status:p.status,slug:p.slug,title:p.title?.rendered,link:p.link,front:f}));
}else console.log("AFTER_XMLRPC_3265_REST",xr.status,xr.data?.message||xr.error||"");
