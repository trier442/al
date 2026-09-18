import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
const base=(process.env.WP_URL||"").replace(/\/$/,"");
const auth="Basic "+Buffer.from((process.env.WP_USERNAME||"")+":"+String(process.env.WP_APP_PASSWORD||"").replace(/\s/g,"")).toString("base64");
async function j(url,authOn=true){
  const r=await fetch(url,{headers:authOn?{Authorization:auth}:{}});
  const t=await r.text();let d;try{d=JSON.parse(t)}catch{d={raw:t.slice(0,500)}}
  return {status:r.status,url:r.url,data:d};
}
const p=await j(base+"/wp-json/wp/v2/posts/233?context=edit");
console.log("post",JSON.stringify({status:p.status,id:p.data?.id,post_status:p.data?.status,slug:p.data?.slug,link:p.data?.link,date:p.data?.date,date_gmt:p.data?.date_gmt,type:p.data?.type,title:p.data?.title?.raw||p.data?.title?.rendered}));
const s=await j(base+"/wp-json/wp/v2/settings?context=edit");
console.log("settings",JSON.stringify({status:s.status,permalink_structure:s.data?.permalink_structure,show_on_front:s.data?.show_on_front,page_on_front:s.data?.page_on_front}));
for(const url of [base+"/?p=233",base+"/2027-suteuk-hwajak-s03b/"]){
  const r=await fetch(url,{redirect:"follow"});
  console.log("public",JSON.stringify({requested:url.replace(base,"<site>"),status:r.status,final:r.url.replace(base,"<site>"),content_type:r.headers.get("content-type")}));
}
// trigger inspect
