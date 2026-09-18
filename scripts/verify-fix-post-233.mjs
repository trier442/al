import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
const base=(process.env.WP_URL||"").replace(/\/$/,"");
const auth="Basic "+Buffer.from((process.env.WP_USERNAME||"")+":"+(process.env.WP_APP_PASSWORD||"").replace(/\s/g,"")).toString("base64");
async function req(url,opts={}){
 const r=await fetch(url,{...opts,headers:{Authorization:auth,"Content-Type":"application/json; charset=utf-8",...(opts.headers||{})},redirect:"manual"});
 const t=await r.text(); let d; try{d=t?JSON.parse(t):{}}catch{d={raw:t}};
 return {status:r.status,headers:Object.fromEntries(r.headers.entries()),data:d,text:t};
}
const current=await req(base+"/wp-json/wp/v2/posts/233?context=edit");
console.log("REST current",current.status,JSON.stringify(current.data && {id:current.data.id,status:current.data.status,slug:current.data.slug,link:current.data.link,title:current.data.title?.raw||current.data.title?.rendered}));
const slug="2027-suteuk-hwajak-s03b";
const bySlug=await req(base+"/wp-json/wp/v2/posts?slug="+encodeURIComponent(slug)+"&context=edit");
console.log("REST by slug",bySlug.status,JSON.stringify(Array.isArray(bySlug.data)?bySlug.data.map(x=>({id:x.id,status:x.status,slug:x.slug,link:x.link,title:x.title?.raw||x.title?.rendered})):bySlug.data));
if(current.status===200){
 const pub=await fetch(current.data.link,{redirect:"manual"});
 console.log("public link",pub.status,current.data.link,"location",pub.headers.get("location")||"");
 const plain=await fetch(base+"/?p=233",{redirect:"manual"});
 console.log("public p233",plain.status,"location",plain.headers.get("location")||"");
}
