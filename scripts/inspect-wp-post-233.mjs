import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
const base=(process.env.WP_URL||"").replace(/\/$/,"");
const auth="Basic "+Buffer.from((process.env.WP_USERNAME||"")+":"+String(process.env.WP_APP_PASSWORD||"").replace(/\s/g,"")).toString("base64");
async function call(url){
  const r=await fetch(url,{headers:{Authorization:auth}});
  const t=await r.text();let d;try{d=JSON.parse(t)}catch{d={raw:t.slice(0,500)}}
  return {status:r.status,data:d};
}
for(const term of ["친환경 포장재","옥수수 껍질","창업 모의 면접"]){
  const u=base+"/wp-json/wp/v2/posts?context=edit&per_page=100&search="+encodeURIComponent(term);
  const x=await call(u);
  console.log("search",term,JSON.stringify((Array.isArray(x.data)?x.data:[]).map(p=>({id:p.id,status:p.status,slug:p.slug,link:p.link,title:p.title?.raw||p.title?.rendered,categories:p.categories}))));
}
