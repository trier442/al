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
const ids=[240,245,...Array.from({length:25},(_,i)=>246+i),3256,3264,3265,3266,3341];
for(const id of ids){
 const r=await j(base+"/wp-json/wp/v2/posts/"+id+"?context=edit");
 if(!r.ok){console.log("ID",id,"REST",r.status,r.data?.code||"",r.data?.message||r.error||"");continue;}
 const p=r.data;
 const f=await front(p.link);
 console.log("ID",id,JSON.stringify({status:p.status,slug:p.slug,title:p.title?.rendered,link:p.link,front:f}));
}
const searches=["학생회장 당선 연설","공유 자전거 관리 실태","건축물의 내진 설계","선택의 역설"];
for(const q of searches){
 const r=await j(base+"/wp-json/wp/v2/posts?context=edit&per_page=20&search="+encodeURIComponent(q));
 if(!r.ok){console.log("SEARCH",q,"REST",r.status,r.data?.message||r.error||"");continue;}
 console.log("SEARCH",q,JSON.stringify(r.data.map(p=>({id:p.id,status:p.status,slug:p.slug,title:p.title?.rendered,link:p.link}))));
}
