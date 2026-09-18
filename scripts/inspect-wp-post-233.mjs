import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
const base=(process.env.WP_URL||"").replace(/\/$/,"");
const auth="Basic "+Buffer.from((process.env.WP_USERNAME||"")+":"+String(process.env.WP_APP_PASSWORD||"").replace(/\s/g,"")).toString("base64");
async function call(url,{authOn=true,method="GET",body}={}){
  const r=await fetch(url,{method,headers:{...(authOn?{Authorization:auth}:{}),...(body?{"Content-Type":"application/json; charset=utf-8"}:{})},body:body?JSON.stringify(body):undefined,redirect:"follow"});
  const t=await r.text();let d;try{d=JSON.parse(t)}catch{d={raw:t.slice(0,500)}}
  return {status:r.status,url:r.url,data:d};
}
for(const id of [211,219,228,233]){
  const p=await call(base+`/wp-json/wp/v2/posts/${id}?context=edit`);
  console.log("before",JSON.stringify({id,status:p.status,post_status:p.data?.status,slug:p.data?.slug,link:p.data?.link,title:p.data?.title?.raw||p.data?.title?.rendered}));
}
const up=await call(base+"/wp-json/wp/v2/posts/233",{method:"POST",body:{status:"publish",slug:"2027-suteuk-hwajak-s03b",title:"[2027 수능특강 화법과 작문] 친환경 포장재 창업 모의 면접 해설 및 변형문제"}});
console.log("update233",JSON.stringify({http:up.status,id:up.data?.id,post_status:up.data?.status,slug:up.data?.slug,link:up.data?.link,message:up.data?.message,code:up.data?.code}));
const p2=await call(base+"/wp-json/wp/v2/posts/233?context=edit");
console.log("after233",JSON.stringify({http:p2.status,id:p2.data?.id,post_status:p2.data?.status,slug:p2.data?.slug,link:p2.data?.link,date:p2.data?.date,date_gmt:p2.data?.date_gmt}));
for(const u of [base+"/?p=233",base+"/2027-suteuk-hwajak-s03b/"]){
  const pr=await call(u,{authOn:false});
  console.log("public233",JSON.stringify({requested:u.replace(base,"<site>"),status:pr.status,final:pr.url.replace(base,"<site>")}));
}
