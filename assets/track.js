/* Automatism visitor collector. Plain ES2020, no imports, no cookies, no localStorage.
   Never throws, never blocks. Exposes window.automatismTrack(name,d) and .session. */
(function () {
"use strict";
var SID="automatism.sid",SRC="automatism.src",t0=Date.now(),memo="",L=location,D=document;
function rand(){try{if(typeof crypto!=="undefined"&&crypto.randomUUID)return crypto.randomUUID();}catch(e){}
for(var s="",i=0;i<32;i++)s+="0123456789abcdef"[Math.random()*16|0];return s;}
function sid(){if(memo)return memo;
try{var s=sessionStorage.getItem(SID);if(!s||!/^[A-Za-z0-9-]{8,64}$/.test(s)){s=rand();sessionStorage.setItem(SID,s);}memo=s;}
catch(e){memo=rand();}return memo;}
function src(){try{var q=new URLSearchParams(L.search).get("src");
if(q&&/^[a-z0-9-]{1,40}$/.test(q))sessionStorage.setItem(SRC,q);
return sessionStorage.getItem(SRC)||"";}catch(e){return "";}}
function own(h){return h===L.hostname||h==="automatism.co.za"||/\.automatism\.co\.za$/.test(h);}
function ref(){try{if(!D.referrer)return "";var h=new URL(D.referrer).hostname;return h&&!own(h)?h:"";}catch(e){return "";}}
function clean(d){var o={},n=0;if(!d||typeof d!=="object")return o;
for(var k in d){if(n>=8)break;if(!/^[a-z_]{1,24}$/.test(k))continue;var v=d[k];
if(typeof v==="string"){o[k]=v.slice(0,80);n++;}else if(typeof v==="number"&&isFinite(v)){o[k]=v;n++;}}
return o;}
function pf(){try{var v=D.querySelector("video[data-film]");return v?v.getAttribute("data-film")||"":"";}catch(e){return "";}}
function send(n,d){try{var data=clean(d);if(n==="pipeline"&&!data.film)data.film=pf();
var b={s:sid(),n:n,p:L.pathname.slice(0,200)},x=src();if(x)b.src=x;
x=ref();if(x)b.ref=x;if(Object.keys(data).length)b.d=data;b=JSON.stringify(b);
var h=L.hostname,url=h==="automatism.co.za"||h==="www.automatism.co.za"?"https://demo.automatism.co.za/api/e":"/api/e";
try{if(navigator.sendBeacon&&navigator.sendBeacon(url,b))return;}catch(e){}
try{if(typeof fetch==="function")fetch(url,{method:"POST",body:b,headers:{"Content-Type":"text/plain"},keepalive:true}).catch(function(){});}catch(e){}}
catch(e){}}
function embed(){try{return new URLSearchParams(L.search).get("embed")==="hero";}catch(e){return false;}}
function video(v){if(v.__at)return;v.__at=true;var seen={},played=false,m=[25,50,75,100];
var film=function(){return v.getAttribute("data-film")||"";};
var check=function(){var dur=v.duration;if(!dur||!isFinite(dur))return;var pct=v.currentTime/dur*100;
if(pct>=97)pct=100;for(var i=0;i<4;i++)if(pct>=m[i]&&!seen[m[i]]){seen[m[i]]=1;send("video",{film:film(),pct:m[i]});}};
v.addEventListener("play",function(){if(played)return;played=true;send("video",{film:film(),pct:0});});
var last=0;v.addEventListener("timeupdate",function(){var dur=v.duration;if(dur&&isFinite(dur)&&v.currentTime<last-1&&last/dur>=0.9&&!seen[100]){seen[100]=1;send("video",{film:film(),pct:100});}last=v.currentTime;check();});v.addEventListener("ended",check);}
if(!embed()){
D.addEventListener("click",function(e){try{var t=e.target;if(!t||!t.closest)return;
var g=t.closest("[data-track]"),tg=g?g.getAttribute("data-track")||"":"";
if(!tg){var a=t.closest("a[href]");if(a){var u=new URL(a.href,L.href);
if((u.protocol==="http:"||u.protocol==="https:")&&u.hostname&&!own(u.hostname))tg="out:"+u.hostname;}}
if(tg)send("click",{target:tg});}catch(err){}},true);
D.addEventListener("click",function(e){try{var b=e.target&&e.target.closest?e.target.closest("[data-pipeline-action]"):null;
if(b)send("pipeline",{action:b.getAttribute("data-pipeline-action")||""});}catch(err){}},true);
try{window.addEventListener("pagehide",function(){send("page_leave",{ms:Date.now()-t0});});}catch(e){}
try{var vs=D.querySelectorAll("video");for(var i=0;i<vs.length;i++)video(vs[i]);}catch(e){}
send("page_view");
}
send.session=sid();window.automatismTrack=send;
})();
