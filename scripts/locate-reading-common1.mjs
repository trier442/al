import dns from "node:dns"; dns.setDefaultResultOrder("ipv4first");
for(const k of ["WP_URL","WP_USERNAME","WP_APP_PASSWORD"]) if(!process.env[k]) throw new Error(k+" missing");
const base=process.env.WP_URL.replace(/\/$/,""); const auth="Basic "+Buffer.from(process.env.WP_USERNAME+":"+process.env.WP_APP_PASSWORD.replace(/\s/g,"")).toString("base64");
async function req(route){let last;for(let a=1;a<=6;a++){try{const r=await fetch(base+"/wp-json"+route,{headers:{Authorization:auth,"Connection":"close"},signal:AbortSignal.timeout(45000)});const t=await r.text();if(!r.ok){const e=new Error(r.status+" "+t.slice(0,500));e.status=r.status;throw e;}return JSON.parse(t);}catch(e){last=e;if(a<6)await new Promise(r=>setTimeout(r,2000*a));}}throw last;}
async function all(type){const out=[];for(let p=1;p<=30;p++){try{const d=await req("/wp/v2/"+type+"?context=edit&status=publish&per_page=100&page="+p);if(!Array.isArray(d)||!d.length)break;out.push(...d);if(d.length<100)break;}catch(e){if(e.status===400)break;throw e;}}return out;}
const rows=[...(await all("pages")),...(await all("posts"))];
const pick=rx=>rows.filter(x=>rx.test(((x.title?.raw||x.title?.rendered||"")+" "+x.slug))).map(x=>({id:x.id,type:x.type,title:(x.title?.raw||x.title?.rendered||"").replace(/<[^>]+>/g,""),slug:x.slug,link:x.link}));
console.log("DOKSEO",JSON.stringify(pick(/2027.*수능특강.*독서|수능특강.*독서/i)));
console.log("COMMON1",JSON.stringify(pick(/공통국어\s*1|공통국어1/i)));
