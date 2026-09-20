import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

export function createDinoScene(container,onDelivered){
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,100);
  camera.position.set(0,2.3,8);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(innerWidth,innerHeight);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xe7c7ff,0x32194f,3));
  const key=new THREE.DirectionalLight(0xff9fd7,4); key.position.set(4,6,5); scene.add(key);

  const dino=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color:0x9f6bff,roughness:.45,metalness:.05});
  const belly=new THREE.MeshStandardMaterial({color:0xe7c7ff,roughness:.5});
  const body=new THREE.Mesh(new THREE.SphereGeometry(1.05,32,24),mat); body.scale.set(1.15,.9,.85); dino.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.63,32,24),mat); head.position.set(.85,.75,.05); dino.add(head);
  const snout=new THREE.Mesh(new THREE.SphereGeometry(.38,24,18),belly); snout.scale.set(1.25,.65,.8); snout.position.set(1.27,.58,.06); dino.add(snout);
  const eyeMat=new THREE.MeshBasicMaterial({color:0xffffff});
  const pupilMat=new THREE.MeshBasicMaterial({color:0x1b1024});
  [0.36,-0.28].forEach(z=>{const eye=new THREE.Mesh(new THREE.SphereGeometry(.09,16,12),eyeMat); eye.position.set(1.17,.92,z); dino.add(eye); const p=new THREE.Mesh(new THREE.SphereGeometry(.04,12,10),pupilMat); p.position.set(1.245,.93,z); dino.add(p);});
  const tail=new THREE.Mesh(new THREE.ConeGeometry(.42,2.5,24),mat); tail.rotation.z=-Math.PI/2; tail.position.set(-1.45,.1,0); dino.add(tail);
  const legGeo=new THREE.CapsuleGeometry(.18,.72,8,16);
  const legs=[];
  [[.52,-.88,.42],[-.42,-.88,.42],[.52,-.88,-.42],[-.42,-.88,-.42]].forEach(p=>{const l=new THREE.Mesh(legGeo,mat); l.position.set(...p); dino.add(l); legs.push(l);});
  const armGeo=new THREE.CapsuleGeometry(.11,.5,6,12);
  const arm1=new THREE.Mesh(armGeo,mat),arm2=arm1.clone();
  arm1.position.set(.75,.05,.55); arm1.rotation.z=-.8; arm2.position.set(.75,.05,-.55); arm2.rotation.z=-.8; dino.add(arm1,arm2);

  const letter=new THREE.Mesh(new THREE.BoxGeometry(.95,.62,.07),new THREE.MeshStandardMaterial({color:0xf7e8fb,roughness:.8}));
  letter.position.set(1.24,.03,0); letter.rotation.z=-.12; dino.add(letter);
  const heart=new THREE.Mesh(new THREE.SphereGeometry(.11,16,12),new THREE.MeshStandardMaterial({color:0xff73b8}));
  heart.scale.set(1.2,.9,.35); heart.position.set(1.25,.03,.06); dino.add(heart);

  const floor=new THREE.Mesh(new THREE.CircleGeometry(5.5,64),new THREE.MeshBasicMaterial({color:0x2b1740,transparent:true,opacity:.38}));
  floor.rotation.x=-Math.PI/2; floor.position.y=-1.35; scene.add(floor);

  dino.position.set(-7,-.05,0); scene.add(dino);
  const stars=[];
  for(let i=0;i<45;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.025+Math.random()*.045,8,6),new THREE.MeshBasicMaterial({color:i%3?0xd8bcff:0xff9ad0}));s.position.set((Math.random()-.5)*14,Math.random()*7-1,(Math.random()-.5)*6-2);scene.add(s);stars.push(s);}
  const clock=new THREE.Clock(); let delivered=false;
  function animate(){
    const t=clock.getElapsedTime();
    if(dino.position.x<1.25)dino.position.x+=.035;
    else if(!delivered){delivered=true;setTimeout(()=>onDelivered?.(),450);}
    legs.forEach((l,i)=>l.rotation.z=Math.sin(t*9+i*Math.PI)*.45);
    dino.position.y=-.05+Math.abs(Math.sin(t*9))*.08;
    dino.rotation.y=Math.sin(t*.7)*.06;
    stars.forEach((s,i)=>s.scale.setScalar(.75+Math.sin(t*2+i)*.25));
    renderer.render(scene,camera); requestAnimationFrame(animate);
  }
  animate();
  const resize=()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);};
  addEventListener('resize',resize);
  return ()=>{removeEventListener('resize',resize);renderer.dispose();container.innerHTML='';};
}