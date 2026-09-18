import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
const base=(process.env.WP_URL||"").replace(/\/$/,"");
const auth="Basic "+Buffer.from((process.env.WP_USERNAME||"")+":"+String(process.env.WP_APP_PASSWORD||"").replace(/\s/g,"")).toString("base64");
async function call(url,{authOn=true,method="GET",body}={}){
  const r=await fetch(url,{method,headers:{...(authOn?{Authorization:auth}:{}),...(body?{"Content-Type":"application/json; charset=utf-8"}:{})},body:body?JSON.stringify(body):undefined,redirect:"follow"});
  const t=await r.text();let d;try{d=JSON.parse(t)}catch{d={raw:t.slice(0,200)}}
  return {status:r.status,url:r.url,data:d};
}
const p=await call(base+"/wp-json/wp/v2/posts/3254?context=edit");
console.log("post3254",JSON.stringify({http:p.status,id:p.data?.id,post_status:p.data?.status,slug:p.data?.slug,link:p.data?.link,title:p.data?.title?.raw||p.data?.title?.rendered}));
for(const u of [base+"/?p=3254",base+"/2027-suteuk-hwajak-s03b/"]){
  const pr=await call(u,{authOn:false});
  console.log("public3254",JSON.stringify({requested:u.replace(base,"<site>"),status:pr.status,final:pr.url.replace(base,"<site>")}));
}
