import fs from "node:fs";

for (const key of ["WP_URL","WP_USERNAME","WP_APP_PASSWORD"]) {
  if (!process.env[key]) throw new Error(`${key} GitHub Secret이 없습니다.`);
}
const base=process.env.WP_URL.replace(/\/$/,"");
const auth="Basic "+Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD.replace(/\s/g,"")}`).toString("base64");
async function wp(url,options={}){
 const res=await fetch(url,{...options,headers:{Authorization:auth,...(options.headers||{})}});
 const text=await res.text(); let data; try{data=text?JSON.parse(text):{}}catch{data={message:text}}
 if(!res.ok)throw new Error(`WordPress ${res.status}: ${data.message||text}`);
 return data;
}
function esc(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function ad(item,pos){
 return `<!-- mk-premium-ad:${pos}:start -->
<div class="mk-premium-ad" style="margin:28px 0;text-align:center;padding:22px;background:#fff4df;border:2px solid #f08a24;border-radius:10px;">
 <p style="margin:0 0 12px;font-size:17px;font-weight:700;color:#7d3d08;">전체 변형문제는 네이버 프리미엄 콘텐츠에서 확인할 수 있습니다.</p>
 <a href="${esc(item.premium_url)}" target="_blank" rel="noopener noreferrer sponsored" style="display:inline-block;padding:16px 24px;background:#e96f14;color:#fff;text-decoration:none;border-radius:7px;font-size:19px;font-weight:700;">${esc(item.title)} 변형문제 다운로드</a>
</div>
<!-- mk-premium-ad:${pos}:end -->`;
}
const items=JSON.parse(fs.readFileSync("wordpress-content/premium-links.json","utf8"));
for(const item of items){
 const slug=decodeURIComponent(new URL(item.post_url).pathname.replace(/^\/+|\/+$/g,""));
 const found=await wp(`${base}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&context=edit`);
 if(found.length!==1)throw new Error(`${item.title}: 게시글을 정확히 1개 찾지 못했습니다. (${found.length})`);
 const post=found[0];
 let content=post.content.raw;
 content=content.replace(/<!-- mk-premium-ad:(?:top|bottom):start -->[\\s\\S]*?<!-- mk-premium-ad:(?:top|bottom):end -->/g,"").trim();
 content=`${ad(item,"top")}\n\n${content}\n\n${ad(item,"bottom")}`;
 await wp(`${base}/wp-json/wp/v2/posts/${post.id}`,{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify({content})});
 console.log(`광고 삽입: ${item.title} -> ${item.premium_url}`);
}
