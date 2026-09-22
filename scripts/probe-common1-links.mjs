import dns from "node:dns";dns.setDefaultResultOrder("ipv4first");
const base=(process.env.WP_URL||"https://modukorean.co.kr").replace(/\/$/,"");
const slugs=[
["비상 박영민","비상-박영민-공통국어1"],
["비상 강호영","비상-강호영-공통국어1"],
["천재 김수학","천재-김수학-공통국어1"],
["천재 김종철","천재-김종철-공통국어1"],
["미래엔 신유식","미래엔-신유식-공통국어1"],
["지학사 김철회","지학사-김철회-공통국어1"],
["동아","동아-공통국어1"],
["창비","창비-공통국어1"],
["해냄에듀","해냄에듀-공통국어1"]
];
for(const [name,slug] of slugs){
 let out={name,slug,status:null,url:base+"/"+slug+"/"};
 for(let a=1;a<=4;a++){try{
  const r=await fetch(out.url,{redirect:"manual",headers:{"Connection":"close"},signal:AbortSignal.timeout(30000)});
  out.status=r.status;out.location=r.headers.get("location");break;
 }catch(e){out.error=e.message;if(a<4)await new Promise(r=>setTimeout(r,1500*a));}}
 console.log(JSON.stringify(out));
}
