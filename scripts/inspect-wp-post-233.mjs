import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
const base=(process.env.WP_URL||"").replace(/\/$/,"");
const auth="Basic "+Buffer.from((process.env.WP_USERNAME||"")+":"+String(process.env.WP_APP_PASSWORD||"").replace(/\s/g,"")).toString("base64");
async function call(url,{authOn=true,method="GET",body}={}){
  const r=await fetch(url,{method,headers:{...(authOn?{Authorization:auth}:{}),...(body?{"Content-Type":"application/json; charset=utf-8"}:{})},body:body?JSON.stringify(body):undefined,redirect:"follow"});
  const t=await r.text();let d;try{d=JSON.parse(t)}catch{d={raw:t.slice(0,500)}}
  return {status:r.status,url:r.url,data:d};
}
const p=await call(base+"/wp-json/wp/v2/posts/233?context=edit");
console.log("before233",JSON.stringify({http:p.status,id:p.data?.id,post_status:p.data?.status,slug:p.data?.slug,title:p.data?.title?.raw||p.data?.title?.rendered}));
if(p.status===200 && p.data?.status==="draft" && String(p.data?.title?.raw||p.data?.title?.rendered||"").includes("친환경 포장재")){
  const d=await call(base+"/wp-json/wp/v2/posts/233?force=true",{method:"DELETE"});
  console.log("delete233",JSON.stringify({http:d.status,deleted:d.data?.deleted,previous_status:d.data?.previous?.status,id:d.data?.previous?.id}));
}else{
  console.log("delete233 skipped");
}
const check=await call(base+"/wp-json/wp/v2/posts/233?context=edit");
console.log("after233",JSON.stringify({http:check.status,code:check.data?.code,message:check.data?.message}));
