/**
 * 生成 TabBar 图标 PNG 文件（纯 Node.js，无需额外依赖）
 * 输出到 src/assets/
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_T = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_T[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG 生成 ───────────────────────────────────────────────────────────────
function makePNG(W, H, pix) {
  const sig = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  function chunk(type, data) {
    const tb = Buffer.from(type,'ascii');
    const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
    const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
    return Buffer.concat([lb, tb, data, cb]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4);
  ihdr[8]=8; ihdr[9]=6; // RGBA
  const raw = Buffer.alloc(H*(1+W*4));
  for (let y=0;y<H;y++) {
    raw[y*(1+W*4)]=0; // filter None
    for (let x=0;x<W;x++) {
      const s=(y*W+x)*4, d=y*(1+W*4)+1+x*4;
      raw[d]=pix[s]; raw[d+1]=pix[s+1]; raw[d+2]=pix[s+2]; raw[d+3]=pix[s+3];
    }
  }
  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',zlib.deflateSync(raw)), chunk('IEND',Buffer.alloc(0))]);
}

// ── 像素绘图工具 ───────────────────────────────────────────────────────────
function canvas(S) { return new Uint8Array(S*S*4); }

function px(p, S, x, y, r, g, b, a=255) {
  if (x<0||y<0||x>=S||y>=S) return;
  const i=(y*S+x)*4;
  if (p[i+3]>0 && a<255) return; // 已有内容不覆盖
  p[i]=r; p[i+1]=g; p[i+2]=b; p[i+3]=a;
}

function fillCircle(p,S,cx,cy,r,R,G,B,a=255) {
  for(let y=cy-r;y<=cy+r;y++) for(let x=cx-r;x<=cx+r;x++)
    if((x-cx)**2+(y-cy)**2<=r*r) px(p,S,x,y,R,G,B,a);
}

function fillRect(p,S,x1,y1,x2,y2,R,G,B,a=255) {
  for(let y=y1;y<=y2;y++) for(let x=x1;x<=x2;x++) px(p,S,x,y,R,G,B,a);
}

function strokeRect(p,S,x1,y1,x2,y2,t,R,G,B,a=255) {
  for(let x=x1;x<=x2;x++) for(let dy=0;dy<t;dy++) { px(p,S,x,y1+dy,R,G,B,a); px(p,S,x,y2-dy,R,G,B,a); }
  for(let y=y1;y<=y2;y++) for(let dx=0;dx<t;dx++) { px(p,S,x1+dx,y,R,G,B,a); px(p,S,x2-dx,y,R,G,B,a); }
}

function fillTriangle(p,S,x1,y1,x2,y2,x3,y3,R,G,B,a=255) {
  const minX=Math.min(x1,x2,x3), maxX=Math.max(x1,x2,x3);
  const minY=Math.min(y1,y2,y3), maxY=Math.max(y1,y2,y3);
  function sign(ax,ay,bx,by,cx,cy){return(ax-cx)*(by-cy)-(bx-cx)*(ay-cy);}
  for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) {
    const d1=sign(x,y,x1,y1,x2,y2);
    const d2=sign(x,y,x2,y2,x3,y3);
    const d3=sign(x,y,x3,y3,x1,y1);
    const hasNeg=(d1<0)||(d2<0)||(d3<0);
    const hasPos=(d1>0)||(d2>0)||(d3>0);
    if(!(hasNeg&&hasPos)) px(p,S,x,y,R,G,B,a);
  }
}

function drawLine(p,S,x1,y1,x2,y2,t,R,G,B,a=255) {
  const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy),steps=Math.ceil(len*2);
  for(let i=0;i<=steps;i++) {
    const tx=x1+dx*i/steps, ty=y1+dy*i/steps;
    fillCircle(p,S,Math.round(tx),Math.round(ty),Math.floor(t/2),R,G,B,a);
  }
}

function arc(p,S,cx,cy,r,a1,a2,t,R,G,B,al=255) {
  const steps=Math.ceil(r*Math.abs(a2-a1)*2);
  for(let i=0;i<=steps;i++){
    const angle=a1+(a2-a1)*i/steps;
    const x=Math.round(cx+r*Math.cos(angle)), y=Math.round(cy+r*Math.sin(angle));
    fillCircle(p,S,x,y,Math.floor(t/2),R,G,B,al);
  }
}

// ── 图标绘制函数 ───────────────────────────────────────────────────────────
const PI=Math.PI;

function drawHome(p,S,r,g,b) {
  // 屋顶三角
  fillTriangle(p,S, S/2,10, 10,40, S-10,40, r,g,b);
  // 墙体
  fillRect(p,S, 20,38, S-20,S-14, r,g,b);
  // 门（挖空=白色）
  fillRect(p,S, S/2-8,S-32, S/2+8,S-14, 255,255,255,255);
}

function drawCart(p,S,r,g,b) {
  // 把手弧线
  arc(p,S, S/2,22, 18, PI,2*PI, 5,r,g,b);
  // 购物袋身体
  strokeRect(p,S, 14,30, S-14,S-20, 4,r,g,b);
  // 轮子
  fillCircle(p,S, 26,S-16, 7,r,g,b);
  fillCircle(p,S, S-26,S-16, 7,r,g,b);
  fillCircle(p,S, 26,S-16, 3,255,255,255,255);
  fillCircle(p,S, S-26,S-16, 3,255,255,255,255);
}

function drawProfile(p,S,r,g,b) {
  // 头
  fillCircle(p,S, S/2,22, 16,r,g,b);
  // 身体（半椭圆）
  for(let y=42;y<S-12;y++) for(let x=8;x<S-8;x++) {
    const nx=(x-S/2)/(S/2-8), ny=(y-42)/(S-12-42);
    if(nx*nx+ny*ny<=1) px(p,S,x,y,r,g,b);
  }
}

// ── 生成所有图标 ───────────────────────────────────────────────────────────
const S=81;
const GRAY=[156,163,175], GREEN=[22,163,74];
const OUT=path.join(__dirname,'../src/assets');
fs.mkdirSync(OUT,{recursive:true});

const icons=[
  {name:'tab-home',      fn:drawHome,    color:GRAY},
  {name:'tab-home-active',fn:drawHome,   color:GREEN},
  {name:'tab-cart',      fn:drawCart,    color:GRAY},
  {name:'tab-cart-active',fn:drawCart,   color:GREEN},
  {name:'tab-profile',   fn:drawProfile, color:GRAY},
  {name:'tab-profile-active',fn:drawProfile,color:GREEN},
];

for(const ic of icons){
  const p=canvas(S);
  ic.fn(p,S,...ic.color);
  const png=makePNG(S,S,p);
  const fp=path.join(OUT,ic.name+'.png');
  fs.writeFileSync(fp,png);
  console.log('✓ '+ic.name+'.png  ('+png.length+' bytes)');
}
console.log('\n全部图标已生成到 src/assets/');
