/* SHIN RIDER — original procedural scene and gameplay. Three.js MIT. */
'use strict';
(() => {
const $=id=>document.getElementById(id), T=window.THREE;
if(!T){$('error').hidden=false;return;}
const touchCapable=(typeof matchMedia==='function'&&(matchMedia('(any-pointer:coarse)').matches||matchMedia('(pointer:coarse)').matches))||(typeof navigator!=='undefined'&&navigator.maxTouchPoints>0)||('ontouchstart' in window);
document.body.classList.toggle('touch-device',touchCapable);
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){$('error').hidden=false;return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;$('world').appendChild(renderer.domElement);const canvasEl=renderer.domElement;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(43,innerWidth/innerHeight,.1,600);scene.fog=new T.FogExp2('#9ba493',.009);
const hemi=new T.HemisphereLight('#e0e5d4','#26382c',2.5);scene.add(hemi);
const sun=new T.DirectionalLight('#ffe4b1',3.5);sun.position.set(-25,35,-35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:25,bottom:-25,near:1,far:100});sun.shadow.bias=-.0005;scene.add(sun);scene.add(sun.target);
const fill=new T.DirectionalLight('#bddeed',2);fill.position.set(10,9,12);scene.add(fill);
const materials={};function mat(color,metalness=0,roughness=.65,extra={}){const key=JSON.stringify([color,metalness,roughness,extra]);return materials[key]||(materials[key]=new T.MeshStandardMaterial({color,metalness,roughness,...extra}));}
const black=mat('#10191b',.35,.42),rubber=mat('#101313',.05,.9),silver=mat('#a8b8b9',.75,.27),white=mat('#e2e7dc',.35,.3),red=mat('#b62329',.25,.4),green=mat('#195b4e',.4,.42),gold=mat('#b39149',.65,.3),eye=mat('#e9a3a2',.3,.22,{emissive:'#db4654',emissiveIntensity:.45}),eyeFacetMat=mat('#efb8b7',.25,.4,{emissive:'#9f2d3a',emissiveIntensity:.2});
const headlightMat=mat('#fff3ba',.1,.2,{emissive:'#ffda84',emissiveIntensity:2}),beltCoreMat=mat('#c3262e',.25,.35,{emissive:'#ff2b3f',emissiveIntensity:.5}),headlightHaloMat=new T.MeshBasicMaterial({color:'#ffe9b0',transparent:true,opacity:0,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false});
function mesh(geo,m,p,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
function box(p,m,x,y,z,w,h,d){return mesh(new T.BoxGeometry(w,h,d),m,p,x,y,z);}
function ell(p,m,x,y,z,a,b,c){const o=mesh(new T.SphereGeometry(1,24,18),m,p,x,y,z);o.scale.set(a,b,c);return o;}
function rod(p,m,a,b,r=.04,r2=r){const v=new T.Vector3(...a),w=new T.Vector3(...b),d=w.clone().sub(v);const o=mesh(new T.CylinderGeometry(r2,r,d.length(),12),m,p);o.position.copy(v.add(w).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
function shape(p,m,points,depth,x=0,y=0,z=0){let s=new T.Shape();points.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.035,bevelThickness:.035});const o=mesh(g,m,p,x,y,z);return o;}
// Lofted fairing sections: [z, centerY, halfWidth, halfHeight].
function fairing(parent,material,sections,segments=12){
 const vertices=[],indices=[];
 sections.forEach(([z,y,w,h])=>{for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;vertices.push(Math.sin(a)*w,y+Math.cos(a)*h,z);}});
 for(let r=0;r<sections.length-1;r++)for(let i=0;i<segments;i++){const a=r*segments+i,b=r*segments+(i+1)%segments,c=a+segments,d=b+segments;indices.push(a,c,b,b,c,d);}
 for(const r of [0,sections.length-1]){const start=vertices.length/3;vertices.push(0,sections[r][1],sections[r][0]);for(let i=0;i<segments;i++){const a=r*segments+i,b=r*segments+(i+1)%segments;indices.push(...(r===0?[start,a,b]:[start,b,a]));}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(geo,material,parent);
}
// Front-facing panels, slightly faceted to retain the film's sculpted armor lines.
function armor(parent,material,outline,center){
 const positions=[...center],indices=[];outline.forEach(p=>positions.push(...p));
 for(let i=0;i<outline.length;i++)indices.push(0,1+i,1+(i+1)%outline.length);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(geo,material,parent);
}
// Motorcycle points forward along -Z. All geometry is created locally.
const bike=new T.Group();scene.add(bike);const wheels=[];
for(const z of [-1.12,1.02]){const wheel=new T.Group();wheel.position.set(0,.51,z);bike.add(wheel);wheels.push(wheel);let tire=mesh(new T.TorusGeometry(.39,.13,14,48),rubber,wheel);tire.rotation.y=Math.PI/2;let rim=mesh(new T.TorusGeometry(.33,.025,8,40),silver,wheel);rim.rotation.y=Math.PI/2;rod(wheel,black,[-.17,0,0],[.17,0,0],.085);for(let i=0;i<8;i++){let a=i*Math.PI/4;rod(wheel,silver,[0,0,0],[0,Math.sin(a)*.33,Math.cos(a)*.33],.018);}for(const side of [-1,1]){let disc=mesh(new T.CylinderGeometry(.25,.25,.014,32),silver,wheel,side*.11);disc.rotation.z=Math.PI/2;let hub=mesh(new T.CylinderGeometry(.11,.11,.025,24),black,wheel,side*.13);hub.rotation.z=Math.PI/2;}}
for(const s of [-1,1]){rod(bike,silver,[s*.17,.52,1.02],[s*.2,.75,-.3],.06);rod(bike,gold,[s*.17,.52,-1.12],[s*.19,1.42,-.65],.045);rod(bike,black,[s*.2,.6,.75],[s*.23,1.15,.2],.055);rod(bike,silver,[s*.22,.66,.58],[s*.23,1.18,.32],.035);for(let k=0;k<6;k++)rod(bike,black,[s*.23,.77+k*.045,.5-k*.02],[s*.27,.79+k*.045,.5-k*.02],.06);}
ell(bike,black,0,.75,0,.34,.34,.45);for(let i=0;i<7;i++)box(bike,silver,0,.61+i*.052,-.02,.66,.018,.4);
const tank=ell(bike,white,0,1.24,-.2,.37,.27,.55);box(bike,black,0,1.17,.48,.52,.17,.66);ell(bike,white,0,1.21,.88,.31,.14,.34);
// Sculpted front cowl with twin headlights, red stripe, windshield and six exhausts.
fairing(bike,white,[[-1.31,1.17,.28,.12],[-1.19,1.27,.37,.23],[-.92,1.32,.41,.3],[-.59,1.26,.34,.24]],10);
ell(bike,black,0,1.17,-1.322,.27,.1,.012);
fairing(bike,white,[[.69,1.21,.29,.09],[1.08,1.26,.23,.11],[1.3,1.31,.18,.055]],8);
for(const s of [-1,1]){ell(bike,headlightMat,s*.155,1.18,-1.34,.09,.075,.016);const panel=shape(bike,white,[[-.65,.78],[-.55,1.28],[-.13,1.39],[.38,1.19],[.24,.61],[-.09,.5]],.035);panel.rotation.y=Math.PI/2;panel.position.set(s*.32,0,-.37);const stripe=shape(bike,red,[[-.45,1.14],[.02,1.27],[.42,1.1],[.3,1.01],[-.06,1.16]],.01);stripe.rotation.y=Math.PI/2;stripe.position.set(s*.385,0,-.37);
for(let i=0;i<3;i++){rod(bike,silver,[s*.32,.68+i*.17,.16],[s*(.44+i*.025),.84+i*.17,1.36],.07,.09);rod(bike,black,[s*(.44+i*.025),.84+i*.17,1.33],[s*(.44+i*.025),.85+i*.17,1.43],.074);}
rod(bike,silver,[s*.18,1.43,-.6],[s*.48,1.47,-.55],.03);rod(bike,black,[s*.38,1.47,-.55],[s*.53,1.47,-.55],.045);rod(bike,silver,[s*.35,1.45,-.7],[s*.57,1.7,-.8],.018);ell(bike,black,s*.58,1.72,-.8,.12,.075,.04);}
const screen=fairing(bike,mat('#76999e',.3,.13,{transparent:true,opacity:.42,side:T.DoubleSide}),[[-1.11,1.49,.27,.015],[-.91,1.75,.25,.015],[-.69,1.83,.19,.012]],10);
for(const side of [-1,1]){rod(bike,white,[side*.28,1.48,-1.1],[side*.21,1.81,-.69],.018);rod(bike,red,[side*.38,1.29,-1.03],[side*.32,1.34,-.63],.025);}
// Seat seam, fuel cap and brake calipers distinguish mechanical parts.
ell(bike,silver,0,1.49,-.19,.09,.012,.09);
for(const side of [-1,1]){box(bike,gold,side*.145,.58,-.92,.07,.18,.09);rod(bike,silver,[side*.3,.65,.38],[side*.46,.65,.38],.025);}
let fender=mesh(new T.TorusGeometry(.53,.06,8,32,Math.PI),white,bike,0,.51,-1.12);fender.rotation.y=Math.PI/2;
const taillight=box(bike,mat('#c3322d',.2,.3,{emissive:'#ee2920',emissiveIntensity:1.5}),0,1.2,1.16,.3,.07,.03);
const rider=new T.Group();bike.add(rider);
ell(rider,black,0,1.5,.36,.3,.22,.3);
const torso=new T.Group();torso.position.set(0,1.57,.26);torso.rotation.x=-.29;rider.add(torso);ell(torso,black,0,.31,0,.34,.48,.22);
for(const s of [-1,1]){
 const breast=[ [.035,.65,-.17],[.19,.7,-.16],[.31,.56,-.17],[.3,.29,-.22],[.06,.21,-.235],[.025,.35,-.25] ].map(([x,y,z])=>[x*s,y,z]);
 if(s<0)breast.reverse();armor(torso,green,breast,[s*.16,.44,-.275]);
 for(let i=0;i<3;i++){
  const y=.18-i*.105;const abdominal=[[.035,y+.035,-.22],[.28,y+.1,-.17],[.27,y+.015,-.22],[.035,y-.05,-.245]].map(([x,y,z])=>[x*s,y,z]);if(s<0)abdominal.reverse();armor(torso,green,abdominal,[s*.15,y+.01,-.265]);
 }
 for(const y of [.58,.3])ell(torso,silver,s*.29,y,-.205,.012,.012,.008);
 ell(torso,black,s*.36,.55,0,.16,.19,.17);rod(rider,black,[s*.35,2.11,.03],[s*.45,1.8,-.18],.12);rod(rider,green,[s*.45,1.8,-.18],[s*.46,1.49,-.55],.09);ell(rider,black,s*.46,1.47,-.55,.085,.08,.11);rod(rider,black,[s*.22,1.49,.36],[s*.4,1.04,-.08],.16);ell(rider,green,s*.4,1.03,-.08,.13,.14,.16);rod(rider,green,[s*.4,1,-.04],[s*.35,.66,.46],.115);ell(rider,green,s*.35,.62,.36,.13,.09,.24);}
box(torso,silver,0,-.01,-.02,.61,.12,.43);ell(torso,beltCoreMat,0,-.01,-.26,.1,.1,.035);for(let i=0;i<8;i++){const a=i*Math.PI/4;rod(torso,silver,[0,-.01,-.3],[Math.cos(a)*.08,-.01+Math.sin(a)*.08,-.3],.008);}
// The belt vortex is attached to the torso so it follows the rider's lean. A
// horizontal waist ring keeps it readable from the default chase camera, where
// the rider's back hides the belt face itself.
const beltFX=new T.Group();beltFX.position.set(0,-.01,0);torso.add(beltFX);
const beltRingMat=new T.MeshBasicMaterial({color:'#b9ffe9',transparent:true,opacity:0,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false});
const beltRing=mesh(new T.TorusGeometry(.52,.018,8,48),beltRingMat,beltFX);beltRing.rotation.x=Math.PI/2;beltRing.castShadow=false;beltRing.receiveShadow=false;
const beltBurstMat=new T.MeshBasicMaterial({color:'#e2fff3',transparent:true,opacity:0,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false});
const beltBurst=mesh(new T.TorusGeometry(.56,.026,8,48),beltBurstMat,beltFX);beltBurst.rotation.x=Math.PI/2;beltBurst.castShadow=false;beltBurst.receiveShadow=false;
const beltVortexPositions=new Float32Array(72*6),beltVortexGeo=new T.BufferGeometry();
beltVortexGeo.setAttribute('position',new T.BufferAttribute(beltVortexPositions,3).setUsage(T.DynamicDrawUsage));
const beltVortexMat=new T.LineBasicMaterial({color:'#c9fff0',transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
const beltVortex=new T.LineSegments(beltVortexGeo,beltVortexMat);beltVortex.frustumCulled=false;beltFX.add(beltVortex);
const beltLight=new T.PointLight('#a8ffe4',0,3,2);beltLight.position.set(0,.02,-.05);beltFX.add(beltLight);
beltFX.visible=false;
const beltIdleMat=new T.MeshBasicMaterial({color:'#ff4052',transparent:true,opacity:0,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false});
const beltIdle=mesh(new T.TorusGeometry(.5,.02,8,48),beltIdleMat,torso,0,-.01,0);beltIdle.rotation.x=Math.PI/2;beltIdle.castShadow=false;beltIdle.receiveShadow=false;
const beltIdleLight=new T.PointLight('#ff3b4e',0,1.6,2);beltIdleLight.position.set(0,-.01,-.08);torso.add(beltIdleLight);
const head=new T.Group();head.position.set(0,2.34,-.05);head.rotation.x=.04;rider.add(head);
const eyeLight=new T.PointLight('#ff5361',0,2.2,2);eyeLight.position.set(0,.1,-.36);head.add(eyeLight);
const helmet=ell(head,mat('#0b1718',.55,.28),0,.065,0,.285,.335,.255);
// Chin follows the helmet profile: forwardmost jaw is behind the eye surface.
const jaw=armor(head,green,[[-.21,-.025,-.16],[-.13,-.045,-.245],[0,-.055,-.25],[.13,-.045,-.245],[.21,-.025,-.16],[.18,-.16,-.155],[.095,-.245,-.12],[0,-.265,-.13],[-.095,-.245,-.12],[-.18,-.16,-.155]],[0,-.145,-.235]);
// The jaw is intentionally double-sided; side edges tuck into the helmet shell.
jaw.material=mat('#286b5b',.3,.46,{side:T.DoubleSide});
for(const side of [-1,1]){
 const rim=ell(head,black,side*.132,.12,-.211,.115,.174,.06);rim.rotation.z=side*.2;
 const compoundEye=ell(head,eye,side*.132,.12,-.23,.102,.158,.041);compoundEye.rotation.z=side*.2;
 // Hexagonal facets sit on the ellipsoid surface rather than floating in front.
 const facets=new T.InstancedMesh(new T.SphereGeometry(1,6,4),eyeFacetMat,60);head.add(facets);const transform=new T.Object3D();
 for(let j=0;j<60;j++){const a=j*2.399,r=.88*Math.sqrt((j+.5)/60),ex=Math.cos(a)*r*.1,ey=Math.sin(a)*r*.154;const rot=side*.2;
  transform.position.set(side*.132+ex*Math.cos(rot)-ey*Math.sin(rot),.12+ex*Math.sin(rot)+ey*Math.cos(rot),-.23-.042*Math.sqrt(1-r*r));transform.scale.set(.007,.009,.002);transform.updateMatrix();facets.setMatrixAt(j,transform.matrix);}
 rod(head,silver,[side*.075,.325,-.105],[side*.17,.66,-.16],.006,.002);
 ell(head,black,side*.262,-.035,.005,.035,.09,.09);
 // Engraved mandible vents follow the curved cheeks without extending the silhouette.
 for(let i=0;i<3;i++)rod(head,black,[side*(.045+i*.039),-.09-i*.014,-.244+i*.013],[side*(.074+i*.039),-.119-i*.014,-.236+i*.016],.006);
 rod(head,mat('#357267',.6,.4),[side*.025,-.15,-.239],[side*.14,-.115,-.219],.004);
}
ell(head,green,0,.112,-.257,.013,.013,.007);
rod(head,silver,[0,.36,-.06],[0,.23,-.218],.008);
ell(rider,red,0,2.22,0,.29,.09,.23);
const SCARF_LENGTH=3.5;
const scarfGeo=new T.PlaneGeometry(.34,SCARF_LENGTH,6,48);scarfGeo.rotateX(Math.PI/2);scarfGeo.translate(-.2,2.2,.12+SCARF_LENGTH/2);const scarf=mesh(scarfGeo,mat('#b51c27',.05,.85,{side:T.DoubleSide}),rider);const scarfBase=scarfGeo.attributes.position.array.slice();
const lamp=new T.SpotLight('#ffe7ab',20,45,.42,.7,1.5);lamp.position.set(0,1.2,-1.3);lamp.target.position.set(0,0,-18);bike.add(lamp,lamp.target);
const headlightFill=new T.PointLight('#ffe7b0',0,10,2);headlightFill.position.set(0,1,-4.2);bike.add(headlightFill);
const headlightHalo=new T.Group();bike.add(headlightHalo);for(const s of [-1,1]){const halo=mesh(new T.CircleGeometry(.15,20),headlightHaloMat,headlightHalo,s*.155,1.18,-1.355);halo.castShadow=false;halo.receiveShadow=false;}
// Persistent GPU buffers: airflow, intake vortex and six exhaust flames.
const windPositions=new Float32Array(96*6),windGeo=new T.BufferGeometry();
windGeo.setAttribute('position',new T.BufferAttribute(windPositions,3).setUsage(T.DynamicDrawUsage));
const windMaterial=new T.LineBasicMaterial({color:'#d6f0e9',transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
const windLines=new T.LineSegments(windGeo,windMaterial);windLines.frustumCulled=false;scene.add(windLines);
const intakePositions=new Float32Array(64*6),intakeGeo=new T.BufferGeometry();
intakeGeo.setAttribute('position',new T.BufferAttribute(intakePositions,3).setUsage(T.DynamicDrawUsage));
const intakeMaterial=new T.LineBasicMaterial({color:'#a6f8e2',transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
const intakeLines=new T.LineSegments(intakeGeo,intakeMaterial);intakeLines.frustumCulled=false;bike.add(intakeLines);
const flameMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
 uniforms:{uTime:{value:0},uPower:{value:0}},
 vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`varying vec2 vUv; uniform float uTime; uniform float uPower;
 void main(){float tail=vUv.y;float pulse=.78+.22*sin(tail*38.-uTime*36.+sin(vUv.x*24.+uTime*19.));
 vec3 hot=mix(vec3(.12,.38,1.),vec3(1.,.55,.12),smoothstep(0.,.25,tail));
 hot=mix(hot,vec3(1.,.12,.008),smoothstep(.3,.95,tail));
 float alpha=(1.-smoothstep(.65,1.,tail))*pulse*uPower*.38;
 gl_FragColor=vec4(hot,alpha);}`});
const flames=[];
for(const side of [-1,1])for(let i=0;i<3;i++){
 const flame=mesh(new T.ConeGeometry(.075,1,12,8,true),flameMaterial,bike,side*(.44+i*.025),.85+i*.17,1.43);
 // Base at the exhaust mouth; pointed end faces rearward (+Z).
 flame.geometry.translate(0,.5,0);flame.rotation.x=Math.PI/2;flame.castShadow=false;flame.receiveShadow=false;flames.push(flame);
}
const exhaustGlow=new T.PointLight('#ff7030',0,7,2);exhaustGlow.position.set(0,1,2);bike.add(exhaustGlow);
let effectPower=0,airPhase=0,chargeFx=0,windBurst=0,darkness=.3,targetDarkness=.3;
function updateVehicleLights(dt){
 darkness=T.MathUtils.damp(darkness,targetDarkness,2.5,dt);const d=T.MathUtils.clamp(darkness,0,1);
 lamp.intensity=4+d*90;headlightMat.emissiveIntensity=.35+d*5;headlightHaloMat.opacity=d*.5;
 eye.emissiveIntensity=.35+d*3.4;eyeFacetMat.emissiveIntensity=.15+d*1.6;eyeLight.intensity=d*1.3;
 beltCoreMat.emissiveIntensity=.25+d*3;beltIdleMat.opacity=d*(state.charging?.06:.45);beltIdleLight.intensity=d*(state.charging?.2:1);
}
function updateEffects(dt,playing){
 updateVehicleLights(dt);
 const active=playing||state.mode==='paused';
 if(playing){effectPower=T.MathUtils.damp(effectPower,state.boost?1:0,8,dt);airPhase+=state.speed/3.6*dt;}
 else if(state.mode!=='paused')effectPower=0;
 const speedRatio=active?T.MathUtils.clamp(state.speed/320,0,1):0;
 windMaterial.opacity=speedRatio*.36+effectPower*.12;windLines.visible=active;
 for(let i=0;i<96;i++){
  const side=i%2?1:-1,range=5+(i%7)*1.1;
  const x=state.x+side*(2.1+(i*1.73%range)),y=.3+(i*1.37%6.5);
  const z=((i*3.71+airPhase*1.6)%65)-48,len=.4+speedRatio*(2+i%4)+effectPower*3;
  windPositions.set([x,y,z,x+side*.05,y-.02,z+len],i*6);
 }
 windGeo.attributes.position.needsUpdate=true;
 intakeMaterial.opacity=active?(state.charging?.85:state.spool>0?.65:speedRatio*.15):0;
 for(let i=0;i<64;i++){
  const u=((i/64+state.time*(state.charging?1.3:.7))%1),a=i*2.399+u*7-state.time*4,r=(1-u)*2+.12;
  const x=Math.cos(a)*r,y=1.55+Math.sin(a)*r*.55,z=-5+u*4.55;
  intakePositions.set([x,y,z,x*.92,y+(1.55-y)*.08,z+.22],i*6);
 }
 intakeGeo.attributes.position.needsUpdate=true;
 flameMaterial.uniforms.uTime.value=state.time;flameMaterial.uniforms.uPower.value=effectPower;
 flames.forEach((flame,i)=>{flame.visible=effectPower>.015;const flicker=1+Math.sin(state.time*47+i*2)*.13;flame.scale.set(1+effectPower*.2,(.5+effectPower*2.2)*flicker,1+effectPower*.2);});
 exhaustGlow.intensity=effectPower*9;
 // Belt vortex: a waist ring plus spiral air streams, readable from the chase view.
 if(playing)chargeFx=T.MathUtils.damp(chargeFx,state.charging?1:0,8,dt);else if(state.mode!=='paused')chargeFx=0;
 if(playing)windBurst=Math.max(0,windBurst-dt*2.4);
 const beltOn=active&&(chargeFx>.012||windBurst>.002);beltFX.visible=beltOn;
 if(beltOn){
  beltRing.scale.setScalar(1+Math.sin(state.time*10)*.06*chargeFx);
  beltRingMat.opacity=.14+chargeFx*.66+windBurst*.15;
  beltBurst.scale.setScalar(1+(1-windBurst)*1.8);beltBurstMat.opacity=windBurst*.75;
  beltVortexMat.opacity=chargeFx*.9;beltLight.intensity=chargeFx*2.4+windBurst*2.5;
  for(let i=0;i<72;i++){
   const u=((i/72+state.time*.75)%1),a=i*2.399+state.time*4.2-u*5.2,r=.18+.9*(1-u);
   const x=Math.sin(a)*r,y=.02+Math.sin(a*1.7)*.2*(1-u*.5),z=Math.cos(a)*r*.5;
   beltVortexPositions.set([x,y,z,x*.45,y*.55,z*.45],i*6);
  }
  beltVortexGeo.attributes.position.needsUpdate=true;
 }else{
  beltRingMat.opacity=0;beltBurstMat.opacity=0;beltVortexMat.opacity=0;beltLight.intensity=0;
 }
 const ready=state.windReady&&!state.boost;
 $('wind-state').textContent=state.boost?'喷焰加速':state.spool>0?'风压聚合…':state.charging?'吸收风之力':state.boostLocked?'松开加速 · 重新蓄风':ready?'风之力满 · 可加速':state.energy>=20?'风之力就绪':'迎风蓄能';
 $('wind-value').textContent=Math.floor(state.energy)+'%';
 $('wind-hint').textContent=state.boost?'松开加速 · 结束喷焰':state.charging?'再按吸风停止 · 转向避障':ready?'SHIFT / 双指 · 喷焰':state.energy<20?'点按吸风充能':'点按吸风 / 加速喷射';
 document.body.classList.toggle('boosting',active&&effectPower>.2);
 document.body.classList.toggle('wind-ready',active&&ready);
 document.body.classList.toggle('absorbing',active&&state.charging);
}
// Recycled scenery keeps draw calls and world coordinates bounded.
const TRACK_CLEAR=6.4;
const environment=new T.Group();scene.add(environment);let envPieces=[],items=[],sceneIndex=0,envClearance=Infinity;
const themes=[{name:'雾隐山道',en:'MOUNTAIN PASS',sky:'#929e8e',fog:.009,ground:'#485345',road:'#343d38',lane:'#8d9685',camX:5.8,camY:[1.2,30],dark:.35},{name:'荒野采石场',en:'THE QUARRY',sky:'#bbab91',fog:.007,ground:'#817663',road:'#514e45',lane:'#a59a80',camX:5.8,camY:[1.2,30],dark:.5},{name:'修卡隧道',en:'SHOCKER TUNNEL',sky:'#0b1518',fog:.018,ground:'#1e292a',road:'#273335',lane:'#5b6a63',camX:5.5,camY:[1.4,7.3],dark:1}];
const roadMat=mat('#343d38',.1,.95),groundMat=mat('#485345'),laneMat=mat('#8d9685',.05,.9);const road=box(environment,roadMat,0,-.12,-80,10,.2,600);const ground=box(environment,groundMat,0,-.3,-80,700,.2,900);
// Static lane dividers sit on the road top; unlike scenery they do not scroll, so they add only two draw calls.
for(const x of [-2.8,2.8]){const lane=box(environment,laneMat,x,.012,-80,.055,.02,600);lane.castShadow=false;}
// Fine road aggregate texture, generated rather than fetched.
const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=128;const ctx=texCanvas.getContext('2d');ctx.fillStyle='#929991';ctx.fillRect(0,0,128,128);let seed=41;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}for(let i=0;i<6000;i++){const v=100+random()*80;ctx.fillStyle=`rgba(${v},${v},${v},.3)`;ctx.fillRect(random()*128,random()*128,1,1);}const tex=new T.CanvasTexture(texCanvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(5,180);roadMat.map=tex;
const scenery=new T.Group();environment.add(scenery);const hazards=new T.Group();environment.add(hazards);
function clearGroup(g){g.traverse(o=>{if(o.geometry)o.geometry.dispose();});g.clear();}
function buildEnvironment(index){sceneIndex=index;const th=themes[index];targetDarkness=th.dark;scene.background=new T.Color(th.sky);scene.fog.color.set(th.sky);scene.fog.density=th.fog;roadMat.color.set(th.road);groundMat.color.set(th.ground);laneMat.color.set(th.lane);hemi.intensity=index===2?.9:2.5;sun.intensity=index===2?.3:3.5;fill.intensity=index===2?1.2:2;clearGroup(scenery);envPieces=[];envClearance=Infinity;seed=22;
for(let i=0;i<80;i++){const g=new T.Group();g.position.z=100-i*5;scenery.add(g);envPieces.push(g);for(let s of [-1,1]){box(g,mat('#bbc1a8'),s*4.7,.008,0,.07,.02,4.8);if(i%2===0){box(g,mat('#bac0ad',.5),s*5.6,.7,0,.09,1.4,.09);box(g,silver,s*5.6,.95,0,.09,.14,10);box(g,mat('#e2d5aa'),s*5.59,1.03,0,.13,.13,.13);}if(index===0){for(let j=0;j<2;j++){const h=7+random()*13,canopy=h*.24,x=s*(TRACK_CLEAR+canopy+random()*22);envClearance=Math.min(envClearance,Math.abs(x)-canopy);rod(g,mat('#41483b'),[x,0,random()*5],[x,h*.8,0],.22,.1);for(let k=0;k<3;k++)mesh(new T.ConeGeometry(h*.24*(1-k*.16),h*.55,7),mat(k%2?'#273f32':'#344b39'),g,x,h*.5+k*h*.18,0);}}else if(index===1){const sx=4+random()*7,sy=3+random()*9,sz=4+random()*5,rockX=s*(TRACK_CLEAR+sx+random()*10);envClearance=Math.min(envClearance,Math.abs(rockX)-sx);const rock=mesh(new T.DodecahedronGeometry(1,0),mat(i%2?'#746e5d':'#928672'),g,rockX,1+random()*3,0);rock.scale.set(sx,sy,sz);if(i%8===0){box(g,mat('#4d5249'),s*7.4,1.3,0,1.5,2.6,1.5);box(g,red,s*7.4,2.8,0,2,.15,1.8);envClearance=Math.min(envClearance,6.4);}}else{box(g,mat('#333f3c',.1),s*6.8,4,0,.5,8,5);box(g,mat('#566059',.3),s*6.65,4,0,.3,8,.3);envClearance=Math.min(envClearance,6.5);if(i%3===0){box(g,mat('#c7e4d7',.1,.4,{emissive:'#ace7cd',emissiveIntensity:2}),s*6.75,4.8,0,.05,.18,2);}}}if(i%2===0)box(g,mat('#c6bfa2'),0,.012,0,.1,.02,2.6);if(index===2){box(g,mat('#303b38'),0,8.1,0,13,.3,5);if(i%3===0)box(g,mat('#4a5852'),0,7.8,0,13,.3,.3);}}
if(index!==2){for(let i=0;i<15;i++){const mr=40+random()*35,mh=40+random()*50,mx=(i%2?1:-1)*(TRACK_CLEAR+8+mr+random()*80);const mountain=mesh(new T.ConeGeometry(mr,mh,5),mat(index===0?'#647360':'#948671'),scenery,mx,10,-30-i*22);envClearance=Math.min(envClearance,Math.abs(mx)-mr);mountain.rotation.y=random()*6;}}
document.querySelectorAll('[data-scene]').forEach((b,i)=>b.classList.toggle('active',i===index));$('location').textContent=th.name;$('status').innerHTML=`0${index+1} / ${th.en} <em>35°18′N 138°42′E · FICTIONAL ROUTE</em>`;
}
// Each run gets a fresh layout. Kinds and lanes are independent, and a lane bag
// keeps barriers from clustering in one lane the way i%3 used to.
let itemSeed=1,itemLaneBag=[],layoutRun=0;
function itemRandom(){itemSeed=(itemSeed*1664525+1013904223)>>>0;return itemSeed/4294967296;}
function resetItemLayout(){
 itemSeed=(Date.now()+((++layoutRun)*2654435761)+Math.floor(Math.random()*4294967296))>>>0;
 itemLaneBag=[];
}
function nextItemLane(){
 if(!itemLaneBag.length){itemLaneBag=[-2.8,0,2.8];for(let i=2;i>0;i--){const j=Math.floor(itemRandom()*(i+1));[itemLaneBag[i],itemLaneBag[j]]=[itemLaneBag[j],itemLaneBag[i]];}}
 return itemLaneBag.pop();
}
function createItems(){
 clearGroup(hazards);items=[];resetItemLayout();
 const kinds=[...Array(10).fill('barrier'),...Array(2).fill('spider'),...Array(18).fill('energy')];
 for(let i=kinds.length-1;i>0;i--){const j=Math.floor(itemRandom()*(i+1));[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
 const firstEnergy=kinds.indexOf('energy');if(firstEnergy!==0)[kinds[0],kinds[firstEnergy]]=[kinds[firstEnergy],kinds[0]];
 for(let i=0;i<kinds.length;i++){
  const kind=kinds[i],g=new T.Group(),lane=i===0?0:nextItemLane();
  g.userData.kind=kind;
  if(kind==='energy'){
   mesh(new T.TorusGeometry(.32,.045,8,24),mat('#a7e4b4',.45,.3,{emissive:'#64d69b',emissiveIntensity:1.2}),g,0,.95,0);
   ell(g,mat('#c3e8ac',.1,.2,{emissive:'#8ccf7a',emissiveIntensity:1}),0,.95,0,.1,.1,.1);
  }else if(kind==='barrier'){
   // A low, clearly readable roadblock preserves jump clearance.
   box(g,black,0,.4,0,1.45,.8,.5);
   for(let j=0;j<5;j++){const stripe=box(g,mat('#ddbb53'),-.57+j*.28,.43,.26,.12,.63,.012);stripe.rotation.z=-.4;}
   // Stylized SHOCKER eagle badge: central crest and stepped spread wings.
   const crest=mat('#e8e4d5',.1,.5),badge=mat('#9d252b',.15,.6);
   box(g,badge,0,.43,.28,.5,.54,.025);
   ell(g,crest,0,.46,.31,.055,.16,.015);
   for(const side of [-1,1])for(let feather=0;feather<3;feather++){
    rod(g,crest,[side*.025,.5-feather*.04,.31],[side*(.2-feather*.035),.62-feather*.075,.31],.017);
   }
   ell(g,crest,0,.62,.31,.04,.04,.015);rod(g,crest,[0,.62,.31],[.07,.6,.31],.012);
   for(const side of [-1,1])box(g,mat('#f17445',.1,.4,{emissive:'#f13b20',emissiveIntensity:.8}),side*.53,.87,0,.16,.12,.2);
  }else{
   // Film-inspired SHOCKER tactical team and Kumo-Aug silhouette.
   const spider=kind==='spider',suit=mat(spider?'#242422':'#202425',.08,.88),vest=mat(spider?'#3c3a32':'#303536',.08,.9),bone=mat('#dadbd2',.1,.65),dark=mat('#101415',.2,.7),metal=mat('#555f5b',.5,.42);
   const body=new T.Group();g.add(body);g.userData.body=body;g.userData.arms=[];
   ell(body,suit,0,1.18,0,.29,.43,.18);box(body,vest,0,1.22,.08,.53,.57,.24);
   box(body,dark,0,.92,.04,.54,.1,.3);box(body,metal,0,.92,.205,.11,.065,.025);
   // Tactical vest: segmented pouches, straps, and a restrained insignia.
   for(const side of [-1,1]){
    box(body,dark,side*.15,1.13,.225,.19,.19,.07);box(body,metal,side*.15,1.24,.26,.19,.015,.015);
    rod(body,dark,[side*.25,1.48,.13],[side*.16,1.31,.22],.035);
    rod(g,suit,[side*.16,.9,0],[side*.22,.48,.02],.1);rod(g,suit,[side*.22,.48,.02],[side*.25,.12,.05],.08);ell(g,dark,side*.25,.09,.09,.11,.08,.16);
    const arm=new T.Group();arm.position.set(side*.3,1.43,0);body.add(arm);g.userData.arms.push(arm);
    rod(arm,suit,[0,0,0],[side*.12,-.26,.015],.09);ell(arm,vest,side*.12,-.26,.015,.095,.095,.09);
    rod(arm,suit,[side*.12,-.26,.015],[side*.14,-.5,.12],.07);ell(arm,dark,side*.14,-.52,.14,.075,.09,.09);
   }
   const head=new T.Group();body.add(head);
   ell(head,dark,0,1.72,0,.19,.23,.17);
   if(!spider){
    // Lower-rank operatives wear a pale spiderweb faceplate, not skeleton suits.
    ell(head,bone,0,1.69,.15,.155,.155,.035);ell(head,dark,-.065,1.75,.177,.045,.025,.012);ell(head,dark,.065,1.75,.177,.045,.025,.012);
    for(let i=-2;i<=2;i++)rod(head,dark,[i*.045,1.58,.173],[i*.055,1.79,.173],.006);
    for(let i=0;i<3;i++)rod(head,dark,[-.13,1.6+i*.05,.177],[.13,1.6+i*.05,.177],.006);
    box(body,mat('#c3c5bc'),0,1.42,.205,.18,.055,.012);
    const cap=mesh(new T.CylinderGeometry(.185,.22,.13,20),dark,head,0,1.94,0);
    ell(head,dark,0,1.895,.13,.22,.035,.16);
    ell(head,metal,0,1.95,.195,.035,.025,.012);
   }else{
    // Spider augment: protective vest, compound green lenses, respirator and dark trailing locks.
    const lens=mat('#426d57',.35,.3,{emissive:'#183e2c',emissiveIntensity:.5});
    ell(head,lens,-.083,1.76,.142,.064,.066,.035);ell(head,lens,.083,1.76,.142,.064,.066,.035);
    ell(head,dark,0,1.64,.18,.12,.1,.065);for(const side of [-1,1]){ell(head,metal,side*.085,1.64,.224,.04,.045,.025);rod(head,bone,[side*.02,1.66,.244],[side*.09,1.61,.221],.008);}
    for(let k=0;k<10;k++){const angle=k/10*Math.PI*2,x=Math.sin(angle)*.16,z=Math.cos(angle)*.12-.04;rod(head,dark,[x,1.87,z],[x*1.5,1.48,z-.11],.028,.018);}
    for(const side of [-1,1])for(let k=0;k<4;k++){const y=1.05-k*.13;ell(g,bone,side*.17,y,.095,.022,.022,.012);}
   }
   for(const feature of head.children)feature.position.y-=1.72;head.position.y=1.72;head.scale.setScalar(1.42);
   const warning=mesh(new T.RingGeometry(.48,.56,32),mat(spider?'#e96d56':'#dfba75',0,.7,{transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false}),g,0,.035,0);warning.rotation.x=-Math.PI/2;warning.visible=false;warning.castShadow=false;g.userData.warning=warning;

  }
  g.position.set(lane,0,-35-i*15);
  hazards.add(g);items.push(g);
 }
}
// Distance-based anticipation and lunge keep the strike legible at any speed.
function animateEnemy(item,time,dt){
 const z=item.position.z,near=z>-48&&z<2;
 // Anticipation is visible early; the actual attack is a quick timed motion.
 if(z>-26&&z<2&&item.userData.attackTime==null)item.userData.attackTime=0;
 if(item.userData.attackTime!=null)item.userData.attackTime+=dt;
 const t=item.userData.attackTime,windup=t==null?0:T.MathUtils.smoothstep(t,0,.10);
 const strike=t==null?0:T.MathUtils.smoothstep(t,.10,.23);
 const bob=Math.sin(time*3.2+item.position.x)*.018;
 item.userData.body.rotation.x=-windup*.09-strike*.22;
 item.userData.body.position.y=bob-windup*.04;
 item.userData.arms[0].rotation.x=-.2+windup*.35-strike*1.85;
 item.userData.arms[1].rotation.x=-.25-windup*.45-strike*(item.userData.kind==='spider'?1.05:.25);
 item.userData.arms[0].rotation.z=.12+strike*.14;
 item.userData.arms[1].rotation.z=-.12-strike*.14;
 item.userData.warning.visible=near&&z<-1;
}
// Finish landmark: industrial gateway inspired by the film's factory locations.
// Its position is derived from distance, not scenery recycling.
const finishGate=new T.Group();scene.add(finishGate);finishGate.visible=false;
const gateDark=mat('#343e3c',.45,.65),gateLight=new T.MeshBasicMaterial({color:'#ffe7a3',fog:false,toneMapped:false});
for(const side of [-1,1]){
 box(finishGate,gateDark,side*4.8,3.3,0,.45,6.6,.6);
 box(finishGate,gateLight,side*4.53,3.3,.04,.18,5.4,.14);
 for(let i=0;i<4;i++)box(finishGate,silver,side*4.8,1.1+i*1.35,.35,.55,.08,.08);
}
box(finishGate,gateDark,0,6.25,0,10,.8,.7);
box(finishGate,gateLight,0,5.65,.38,8.7,.2,.14);
const signCanvas=document.createElement('canvas');signCanvas.width=1024;signCanvas.height=128;const signCtx=signCanvas.getContext('2d');
signCtx.fillStyle='#f8d890';signCtx.fillRect(0,0,1024,128);signCtx.font='bold 76px sans-serif';signCtx.textAlign='center';signCtx.textBaseline='middle';signCtx.fillStyle='#172526';signCtx.fillText('FINISH  /  终点',512,68);
const signTexture=new T.CanvasTexture(signCanvas);signTexture.colorSpace=T.SRGBColorSpace;
const finishLamp=new T.PointLight('#ffe7a3',55,22,2);finishLamp.position.set(0,5,1);finishGate.add(finishLamp);
const sign=mesh(new T.PlaneGeometry(8.7,1.1),new T.MeshBasicMaterial({map:signTexture,side:T.DoubleSide,fog:false,toneMapped:false}),finishGate,0,6.27,.37);sign.castShadow=false;
for(let i=0;i<10;i++)box(finishGate,mat(i%2?'#ddddce':'#252e2b'),-4.5+i,.025,0,1,.025,.55);
function updateFinish(distance,mode){finishGate.position.z=-(7000-distance);finishGate.visible=mode!=='intro'&&distance>=6600&&distance<=7004;}
buildEnvironment(0);createItems();
const state={mode:'intro',speed:0,x:0,distance:0,score:0,energy:100,hp:100,jump:0,vy:0,invulnerable:0,camera:1,time:0,boost:false,charging:false,absorbing:false,windReady:true,spool:0,boostLocked:false};let best=0;try{best=Number(localStorage.getItem('shin-rider-best'))||0;}catch{}$('best').textContent=String(best).padStart(5,'0');const keys={},touch={gas:false,steer:0,boost:false,pointers:new Map(),primary:null,startX:0,hintTimer:0};let sound=false,audioContext,engine,gain,windGain,toastTimer=0,zoom=1;
function audioInit(){if(audioContext)return;try{audioContext=new(window.AudioContext||window.webkitAudioContext)();engine=audioContext.createOscillator();engine.type='sawtooth';const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=180;gain=audioContext.createGain();gain.gain.value=0;engine.connect(filter);filter.connect(gain);gain.connect(audioContext.destination);engine.start();const noise=audioContext.createBufferSource(),noiseBuffer=audioContext.createBuffer(1,audioContext.sampleRate*2,audioContext.sampleRate),data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.32;noise.buffer=noiseBuffer;noise.loop=true;const windFilter=audioContext.createBiquadFilter();windFilter.type='bandpass';windFilter.frequency.value=720;windFilter.Q.value=.7;windGain=audioContext.createGain();windGain.gain.value=0;noise.connect(windFilter);windFilter.connect(windGain);windGain.connect(audioContext.destination);noise.start();}catch{}}
function toggleSound(){audioInit();sound=!sound;if(sound)audioContext?.resume();$('audio').textContent='声音 '+(sound?'ON':'OFF');}
function ping(f,d=.12){if(!sound||!audioContext)return;const o=audioContext.createOscillator(),g=audioContext.createGain();o.frequency.setValueAtTime(f,audioContext.currentTime);o.frequency.exponentialRampToValueAtTime(f*.6,audioContext.currentTime+d);g.gain.setValueAtTime(.07,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+d);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+d);}
function toast(s){$('toast').textContent=s;toastTimer=2;}
function touchReset(){touch.gas=false;touch.steer=0;touch.boost=false;touch.pointers.clear();touch.primary=null;}
function hideGestureHint(){touch.hintTimer=0;$('gesture-hint')?.classList.remove('show');}
function showGestureHint(){if(!touchCapable)return;touch.hintTimer=7;$('gesture-hint')?.classList.add('show');}
function start(){if($('result').open)$('result').close();Object.assign(state,{mode:'playing',camera:1,speed:110,x:0,distance:0,score:0,energy:100,hp:100,jump:0,vy:0,invulnerable:0,boost:false,charging:false,absorbing:false,windReady:true,spool:0,boostLocked:false});effectPower=0;chargeFx=0;windBurst=0;Object.keys(keys).forEach(k=>delete keys[k]);touchReset();showGestureHint();zoom=1;$('camera').textContent='C · 追逐视角';camera.position.set(0,3.2,7.5);createItems();$('intro').hidden=true;$('hud').hidden=false;document.body.classList.add('playing');$('pause').textContent='Ⅱ 暂停';toast('突破封锁 · 抵达 7 KM');audioContext?.resume();}
function home(){state.mode='intro';$('hud').hidden=true;$('intro').hidden=false;document.body.classList.remove('playing');if($('result').open)$('result').close();touchReset();hideGestureHint();state.x=0;state.jump=0;state.invulnerable=0;state.speed=0;state.boost=false;state.charging=false;state.absorbing=false;state.windReady=false;state.spool=0;effectPower=0;chargeFx=0;windBurst=0;}
function finish(win){state.mode='finished';state.absorbing=false;state.charging=false;touchReset();hideGestureHint();const total=state.score+Math.floor(state.distance/10)+(win?500:0);if(total>best){best=total;try{localStorage.setItem('shin-rider-best',best);}catch{}}$('best').textContent=String(best).padStart(5,'0');$('result-label').textContent=win?'MISSION COMPLETE':'SIGNAL LOST';$('result-title').textContent=win?'风从未停下。':'再一次，迎风而行。';$('result-text').textContent=`行驶 ${(state.distance/1000).toFixed(2)} km · 总分 ${total} · 最佳 ${best}`;$('result').showModal();}
function pause(){if(!['playing','paused'].includes(state.mode))return;state.mode=state.mode==='playing'?'paused':'playing';state.absorbing=false;state.charging=false;touchReset();$('pause').textContent=state.mode==='paused'?'▶ 继续':'Ⅱ 暂停';toast(state.mode==='paused'?'骑行已暂停':'继续骑行');}
const cameraNames=['电影跟拍','追逐视角','侧面跟拍','骑士视角'];function cycleCamera(){state.camera=(state.camera+1)%4;$('camera').textContent='C · '+cameraNames[state.camera];}
function jump(){if(state.mode==='playing'&&state.jump===0){state.vy=6.5;state.jump=.01;ping(220);}}
function toggleAbsorb(){if(state.mode!=='playing')return;if(state.absorbing){state.absorbing=false;state.charging=false;toast('吸风停止');return;}if(state.boost){toast('喷焰中无法吸风');return;}if(state.energy>=100||state.windReady){toast('风之力已满 · 直接加速');return;}if(state.speed<40){toast('需要 40 km/h 以上');return;}state.absorbing=true;toast('吸风开始 · 风之力上升');ping(300,.15);}
function keyAction(code){if(code==='Space')jump();if(code==='KeyC')cycleCamera();if(code==='KeyP')pause();if(code==='KeyM')toggleSound();if(code==='KeyE')toggleAbsorb();if(code==='KeyR'&&state.mode!=='intro')start();}
addEventListener('keydown',e=>{if($('instructions').open||$('result').open)return;if(['Space','ArrowUp','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!keys[e.code])keyAction(e.code);keys[e.code]=true;});addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{Object.keys(keys).forEach(k=>delete keys[k]);touchReset();hideGestureHint();if(state.mode==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.mode==='playing'){touchReset();hideGestureHint();pause();}});
// Canvas gestures: one finger holds throttle and drags to steer; a second finger adds boost.
function touchDown(e){if(e.pointerType!=='touch'||state.mode!=='playing')return;e.preventDefault();if(touch.pointers.has(e.pointerId))return;touch.pointers.set(e.pointerId,{startX:e.clientX,startY:e.clientY});if(touch.primary===null){touch.primary=e.pointerId;touch.startX=e.clientX;touch.gas=true;}touch.boost=touch.pointers.size>=2;if(touch.hintTimer>0)hideGestureHint();try{canvasEl.setPointerCapture(e.pointerId);}catch{}}
function touchMove(e){if(e.pointerType!=='touch')return;const p=touch.pointers.get(e.pointerId);if(!p)return;e.preventDefault();if(e.pointerId!==touch.primary)return;const dx=e.clientX-p.startX,dead=8,max=64;touch.steer=Math.abs(dx)<=dead?0:Math.sign(dx)*Math.min(1,(Math.abs(dx)-dead)/(max-dead));}
function touchEnd(e){if(!touch.pointers.has(e.pointerId))return;touch.pointers.delete(e.pointerId);touch.boost=touch.pointers.size>=2;if(!touch.pointers.size){touch.gas=false;touch.steer=0;touch.primary=null;}else if(touch.primary===e.pointerId){const next=touch.pointers.entries().next().value;touch.primary=next[0];touch.startX=next[1].startX;touch.steer=0;}try{canvasEl.releasePointerCapture(e.pointerId);}catch{}}
canvasEl.addEventListener('pointerdown',touchDown,{passive:false});canvasEl.addEventListener('pointermove',touchMove,{passive:false});canvasEl.addEventListener('pointerup',touchEnd);canvasEl.addEventListener('pointercancel',touchEnd);canvasEl.addEventListener('lostpointercapture',touchEnd);
$('start').onclick=start;$('restart').onclick=start;$('home').onclick=home;$('back').onclick=home;$('pause').onclick=pause;$('camera').onclick=cycleCamera;$('audio').onclick=toggleSound;$('fullscreen').onclick=()=>{(document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen())?.catch(()=>toast('当前浏览器不支持全屏'));};$('help').onclick=()=>{if(state.mode==='playing')pause();$('instructions').showModal();};$('close-help').onclick=()=>$('instructions').close();$('result').addEventListener('cancel',e=>e.preventDefault());
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>buildEnvironment(Number(b.dataset.scene)));
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.key]=true;keyAction(b.dataset.key);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys[b.dataset.key]=false;});
canvasEl.style.touchAction='none';canvasEl.addEventListener('wheel',e=>{e.preventDefault();zoom=T.MathUtils.clamp(zoom+e.deltaY*.001,.65,1.8);},{passive:false});
addEventListener('resize',()=>{touchReset();camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
let last=performance.now();const desired=new T.Vector3(),look=new T.Vector3();
function update(dt){const playing=state.mode==='playing';if(state.mode!=='paused'&&state.mode!=='finished')state.time+=dt;const t=state.time;
if(playing&&touch.hintTimer>0){touch.hintTimer-=dt;if(touch.hintTimer<=0)hideGestureHint();}
if(playing){
 const throttle=keys.KeyW||keys.ArrowUp||touch.gas;
 const wantsBoost=!!(keys.ShiftLeft||keys.ShiftRight||touch.boost);
 const wasFull=state.energy>=100;
 if(!wantsBoost){state.boostLocked=false;state.spool=0;}
 if(wantsBoost)state.absorbing=false;
 if(state.absorbing&&state.speed<40)state.absorbing=false;
 state.charging=!!(state.absorbing&&!wantsBoost&&state.speed>=40&&state.energy<100);
 const wasBoosting=state.boost;
 if(wantsBoost&&!state.boostLocked){
  if(state.spool===0&&state.energy<20){state.boostLocked=true;toast('风之力不足 · 点按吸风充能');}
  else state.spool+=dt;
 }else state.spool=0;
 state.boost=wantsBoost&&!state.boostLocked&&state.spool>=.55;
 if(state.boost&&!wasBoosting){state.windReady=false;toast('风之力释放 · CYCLONE OVERDRIVE');ping(130,.4);}
 const recharge=state.speed>=40?(state.charging?30:3+state.speed/80):0;
 state.energy=T.MathUtils.clamp(state.energy+(state.boost?-28:recharge)*dt,0,100);
 if(state.boost&&state.energy===0){state.boost=false;state.boostLocked=true;state.spool=0;toast('风能耗尽 · 松开加速后吸风');}
 const limit=state.boost?320:state.charging?170:220;
 let acceleration=state.boost?100:state.speed>limit?-45:throttle?65:state.speed>115?-14:state.speed<110?18:0;
 if(state.charging&&state.speed>170)acceleration=-45;
 const previousSpeed=state.speed;
 state.speed=T.MathUtils.clamp(state.speed+acceleration*dt,0,320);
 if(previousSpeed<=limit&&state.speed>limit)state.speed=limit;
 let turn=T.MathUtils.clamp((keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+touch.steer,-1,1);state.x=T.MathUtils.clamp(state.x+turn*dt*(3.1+Math.min(state.speed,220)/90),-4.05,4.05);bike.rotation.z=T.MathUtils.lerp(bike.rotation.z,-turn*.2,dt*7);state.distance+=state.speed/3.6*dt;state.invulnerable=Math.max(0,state.invulnerable-dt);if(state.jump>0){state.vy-=15*dt;state.jump=Math.max(0,state.jump+state.vy*dt);}const move=state.speed/3.6*dt;for(const g of envPieces){g.position.z+=move;if(g.position.z>100)g.position.z-=400;}
for(const item of items){const previousZ=item.position.z;item.position.z+=move;const isEnergy=item.userData.kind==='energy';if(isEnergy)item.rotation.y+=dt*2;else if(item.userData.kind==='spider')animateEnemy(item,state.time,dt);if(item.position.z>8){item.position.z-=450;item.position.x=nextItemLane();item.visible=true;item.userData.attackTime=null;}if(item.visible&&(previousZ<1&&item.position.z>-1&&item.position.z<8)&&Math.abs(item.position.x-state.x)<(isEnergy?.85:1.05)){if(isEnergy&&state.jump<1.2){state.score+=25;state.energy=Math.min(100,state.energy+10);item.visible=false;ping(740);toast('+25 · 普拉纳吸收');}else if(!isEnergy&&state.jump<.8&&state.invulnerable===0){const damage=item.userData.kind==='spider'?20:10;state.hp=Math.max(0,state.hp-damage);state.speed*=.5;state.invulnerable=1.7;item.visible=false;ping(75,.35);toast((item.userData.kind==='spider'?'蜘蛛怪人':'路障')+' · 生命 -'+damage+'%');if(state.hp<=0)finish(false);}}}
 if(state.energy>=100){
  if(!wasFull&&!state.windReady){state.windReady=true;windBurst=1;state.absorbing=false;state.charging=false;toast('风之力充满 · 可以加速');ping(880,.3);if(typeof navigator!=='undefined'&&navigator.vibrate)navigator.vibrate(30);}
  else state.windReady=true;
 }else state.windReady=false;
 if(state.distance>=7000&&state.mode==='playing')finish(true);const next=Math.min(2,Math.floor(state.distance/(7000/3)));if(next>Math.floor((state.distance-move)/(7000/3))&&state.distance<7000){buildEnvironment(next);toast('进入区域 · '+themes[next].name);}
}else{if(state.mode!=='paused'){state.boost=false;state.charging=false;}if(state.mode==='intro'){bike.rotation.z=Math.sin(t*.5)*.015;}}
bike.position.set(state.x,state.jump+(state.mode==='playing'?Math.sin(t*22)*state.speed*.00005:0),0);bike.visible=!(state.invulnerable>0&&Math.floor(t*12)%2===0);for(const w of wheels)if(playing)w.rotation.x-=state.speed/3.6/.51*dt;
// Fixed neck seam, travelling waves and a tapered fluttering tip.
const attr=scarfGeo.attributes.position,wind=state.mode==='intro'?.25:T.MathUtils.clamp(state.speed/260,0,1);
for(let i=0;i<attr.count;i++){
 const j=i*3,u=T.MathUtils.clamp((scarfBase[j+2]-.12)/SCARF_LENGTH,0,1),cross=(scarfBase[j]+.2)/.17;
 const phase=t*(5+wind*10)-u*12,amp=u*(.09+wind*.18),droop=(1-wind)*.85*u*u;
 const x=-.2+(scarfBase[j]+.2)*(1-u*.25)+Math.sin(phase*.73)*amp-bike.rotation.z*u*.7;
 const y=2.2-droop+Math.sin(phase)*amp+Math.sin(phase*1.8+cross*1.5)*u*.055;
 const z=.12+u*SCARF_LENGTH*(.86+wind*.14)+Math.sin(phase*.5)*u*.04;
 attr.setXYZ(i,x,y,z);
}
attr.needsUpdate=true;scarfGeo.computeVertexNormals();scarfGeo.computeBoundingSphere();updateEffects(dt,playing);
if(state.mode==='intro'){desired.set(-5.8,3.0,-7.8);look.set(1.5,1.35,0);if(innerWidth<800){desired.set(-6.4,3.2,-9.5);look.set(.3,1.4,0);}}else{const portrait=innerHeight>innerWidth;switch(state.camera){case 0:desired.set(state.x-5.4,3,6.8);look.set(state.x,1.1,-1.8);break;case 1:desired.set(state.x,portrait?3.6:3.2,portrait?9.2:7.5);look.set(state.x,1.2,-5);break;case 2:desired.set(state.x-7.8,2.4,.8);look.set(state.x,1.4,0);break;case 3:desired.set(state.x,2.4,-.35);look.set(state.x,1.9,-15);break;}}
if(zoom!==1){desired.sub(look).multiplyScalar(zoom).add(look);}const safe=themes[sceneIndex];if(safe.camX){desired.x=T.MathUtils.clamp(desired.x,-safe.camX,safe.camX);desired.y=T.MathUtils.clamp(desired.y,safe.camY[0],safe.camY[1]);}camera.position.lerp(desired,Math.min(1,dt*5));if(safe.camX){camera.position.x=T.MathUtils.clamp(camera.position.x,-safe.camX,safe.camX);camera.position.y=T.MathUtils.clamp(camera.position.y,safe.camY[0],safe.camY[1]);}camera.lookAt(look);camera.fov=T.MathUtils.damp(camera.fov,state.mode==='intro'?43:43+Math.min(state.speed/220,1)*9+effectPower*9,3,dt);camera.updateProjectionMatrix();
if(gain){gain.gain.setTargetAtTime(sound&&playing?.025:0,audioContext.currentTime,.1);engine.frequency.setTargetAtTime(35+state.speed*.55+effectPower*25,audioContext.currentTime,.1);}
 if(windGain){windGain.gain.setTargetAtTime(sound&&playing&&state.charging?.09:0,audioContext.currentTime,.15);}
if(toastTimer>0&&state.mode!=='paused'){toastTimer-=dt;if(toastTimer<=0)$('toast').textContent='';}
updateFinish(state.distance,state.mode);$('speed').textContent=String(Math.round(state.speed)).padStart(3,'0');$('distance').textContent=(state.distance/1000).toFixed(2);$('progress').style.width=Math.min(100,state.distance/70)+'%';$('score').textContent=String(state.score).padStart(4,'0');$('energy').style.width=state.energy+'%';$('health-value').textContent=state.hp+'%';$('health-fill').style.width=state.hp+'%';$('health').classList.toggle('critical',state.hp<=25);$('gear').textContent=state.speed<1?'N':Math.min(6,1+Math.floor(state.speed/48));
}
camera.position.set(-5.8,3,-7.8);
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;update(dt);renderer.render(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
// Read-only snapshot for diagnostics and automated smoke checks.
window.riderGame={snapshot:()=>({...state,scene:sceneIndex,objects:renderer.info.render.calls,flamePower:effectPower,windOpacity:windMaterial.opacity,scarfLength:SCARF_LENGTH,clearance:Number.isFinite(envClearance)?+envClearance.toFixed(2):null,beltPower:+chargeFx.toFixed(3),windBurst:+windBurst.toFixed(3),darkness:+darkness.toFixed(2),headlight:+lamp.intensity.toFixed(1),eyeGlow:+eye.emissiveIntensity.toFixed(2),beltGlow:+beltCoreMat.emissiveIntensity.toFixed(2),finishVisible:finishGate.visible,finishZ:finishGate.position.z,items:items.map(it=>({kind:it.userData.kind,x:+it.position.x.toFixed(2),z:+it.position.z.toFixed(2),visible:it.visible}))}),start,pause,home,setScene:buildEnvironment};
})();
