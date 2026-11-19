"""Original animated Great Hall scene. Run with Blender, no paid services."""
import bpy, math, random, json, sys, time
from mathutils import Vector, Matrix
from pathlib import Path
from bpy_extras.object_utils import world_to_camera_view

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'design/ticket3d/scene2'
OUT.mkdir(parents=True,exist_ok=True)
random.seed(2612)
print('Building Great Hall scene',flush=True)
FPS=18
SECONDS=24
W,H=960,432
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='BLENDER_WORKBENCH'
scene.render.resolution_x=W
scene.render.resolution_y=H
scene.render.resolution_percentage=100
scene.render.fps=FPS
scene.frame_start=1
scene.frame_end=FPS*SECONDS
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGB'
scene.render.image_settings.compression=12
scene.render.filepath=str(OUT/'')+'/'
scene.render.use_file_extension=True
scene.display.render_aa='5'
sh=scene.display.shading
sh.light='STUDIO'
sh.studiolight_rotate_z=.35
sh.color_type='MATERIAL'
sh.show_shadows=True
sh.show_cavity=True
sh.cavity_type='BOTH'
sh.curvature_ridge_factor=1.2
sh.curvature_valley_factor=1.0
sh.cavity_ridge_factor=1.1
sh.cavity_valley_factor=1.1
sh.show_specular_highlight=True
sh.background_type='WORLD'
scene.world.color=(.018,.026,.058)
scene.view_settings.view_transform='Standard'
scene.view_settings.look='Medium High Contrast'
scene.view_settings.exposure=0
scene.render.film_transparent=False

def material(name,color,metal=0,rough=.5):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,1)
    m.metallic=metal
    m.roughness=rough
    return m
M={
 'stone':material('midnight blue stone',(.10,.16,.24)),
 'trim':material('warm carved stone',(.35,.34,.32)),
 'floor':material('polished dark slate',(.075,.10,.15)),
 'wood':material('warm walnut',(.30,.13,.055)),
 'edge':material('carved walnut edge',(.17,.065,.025)),
 'gold':material('antique gold',(.85,.53,.14),.55,.28),
 'scarlet':material('Gryffindor scarlet',(.48,.025,.055)),
 'green':material('Slytherin emerald',(.025,.28,.16)),
 'blue':material('Ravenclaw blue',(.025,.15,.45)),
 'yellow':material('Hufflepuff amber',(.85,.52,.06)),
 'wax':material('ivory candle wax',(.94,.79,.51)),
 'flame':material('gold candle fire',(1.0,.69,.12)),
 'plate':material('ivory porcelain',(.88,.87,.72),.1,.25),
 'bread':material('golden bread',(.82,.40,.09)),
 'cream':material('vanilla cream',(.99,.88,.62)),
 'chocolate':material('chocolate',(.20,.065,.035)),
 'red':material('red fruit',(.72,.025,.045)),
 'leaf':material('pine and herbs',(.025,.24,.10)),
 'purple':material('grapes',(.23,.035,.30)),
 'pumpkin':material('pumpkin',(.98,.30,.035)),
 'hat':material('weathered Sorting Hat',(.31,.14,.065)),
 'hat_light':material('hat folded cloth',(.46,.23,.10)),
 'dark':material('deep folds',(.035,.018,.011)),
 'cup':material('Hogwarts cup',(.045,.075,.09)),
 'liquid':material('magical amber drink',(.94,.47,.08),.18,.15),
 'glass':material('night sky window',(.06,.16,.33)),
 'cyan':material('blue spell',(.12,.65,1)),
 'spellgold':material('gold spell',(1,.58,.12)),
}
print('Materials ready',flush=True)
def attach(o,mat,parent=None):
    o.data.materials.append(M[mat] if isinstance(mat,str) else mat)
    if parent:o.parent=parent
    return o
def empty(name,loc=(0,0,0)):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;return o
def cube(name,loc,size,mat,parent=None,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    attach(o,mat,parent)
    if bevel:
        mod=o.modifiers.new('soft carved edges','BEVEL');mod.width=bevel;mod.segments=2
        o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
    return o
def uv(name,loc,scale,mat,parent=None,segments=16,rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale;attach(o,mat,parent)
    for p in o.data.polygons:p.use_smooth=True
    return o
def cylinder(name,loc,r,depth,mat,parent=None,r2=None,vertices=20):
    if r2 is None:bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc)
    else:bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r2,depth=depth,location=loc)
    o=bpy.context.object;o.name=name;attach(o,mat,parent)
    for p in o.data.polygons:p.use_smooth=True
    return o
def torus(name,loc,major,minor,mat,parent=None):
    bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=8,major_radius=major,minor_radius=minor,location=loc)
    o=bpy.context.object;o.name=name;attach(o,mat,parent)
    for p in o.data.polygons:p.use_smooth=True
    return o
def curve(name,points,mat,r=.04,parent=None):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,v in zip(s.points,points):p.co=(*v,1)
    c.bevel_depth=r;c.bevel_resolution=2
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);attach(o,mat,parent);return o
def text(name,body,loc,size,mat,parent=None):
    c=bpy.data.curves.new(name,'FONT');c.body=body;c.size=size;c.align_x='CENTER';c.extrude=.012;c.bevel_depth=.003
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(math.pi/2,0,0);attach(o,mat,parent);return o

# The hall is a full 3D set, not the printed ticket enlarged.
cube('slate hall floor',(0,9,-.17),(21,45,.3),'floor')
for x in range(-10,11,2):
    curve('flagstone seam',[(x,-12,.001),(x,30,.001)],'stone',.013)
for y in range(-10,31,3):
    curve('flagstone cross seam',[(-10,y,.002),(10,y,.002)],'stone',.012)
cube('back wall',(0,31,6),(21,.5,13),'stone')
cube('left wall',(-10,11,6),(.4,41,13),'stone')
cube('right wall',(10,11,6),(.4,41,13),'stone')
cube('enchanted dark ceiling',(0,11,13),(21,41,.3),'floor')
for y in [-3,4,11,18,25]:
    for x in [-9.6,9.6]:
        cylinder('Gothic stone column',(x,y,4.3),.40,8.6,'trim',vertices=12)
        cube('column foot',(x,y,.3),(1.1,1.1,.6),'trim',bevel=.06)
    pts=[]
    for k in range(25):
        a=math.pi*k/24
        pts.append((9.6*math.cos(a),y,8.2+4.2*math.sin(a)))
    curve('high vault rib',pts,'trim',.17)
for x in [-6,-2,2,6]:
    cube('tall blue window',(x,30.65,6),(2.7,.08,7.5),'glass')
    pts=[(x-1.4,30.50,2.3),(x-1.4,30.50,8.0),(x-1.2,30.50,9.0),(x-.6,30.50,10.0),(x,30.50,10.65),(x+.6,30.50,10.0),(x+1.2,30.50,9.0),(x+1.4,30.50,8.0),(x+1.4,30.50,2.3)]
    curve('pointed Gothic window',pts,'gold',.11)
    for dx in [-.8,0,.8]:curve('window mullion',[(x+dx,30.45,2.4),(x+dx,30.45,8.9)],'trim',.04)
    for z in [3.3,4.9,6.5,8.1]:curve('window transom',[(x-1.3,30.45,z),(x+1.3,30.45,z)],'trim',.04)
text('Hogwarts hall lettering','HOGWARTS',(0,30.1,11.4),.85,'gold')
print('Hall architecture ready',flush=True)
for x,col,letter in [(-7.2,'scarlet','G'),(-2.5,'green','S'),(2.5,'blue','R'),(7.2,'yellow','H')]:
    cube('hanging house banner',(x,27.8,6.1),(1.65,.10,3.5),col,bevel=.04)
    cube('banner gold top',(x,27.7,7.9),(1.9,.16,.12),'gold')
    text('house monogram',letter,(x,27.68,5.7),1.2,'gold')

# A Christmas tree behind the feast.
tree=empty('Christmas tree',(7.4,24,0))
cylinder('tree trunk',(0,0,.7),.25,1.4,'wood',tree)
for z,r in [(1.4,1.65),(2.35,1.35),(3.2,1.05),(4.0,.72),(4.6,.40)]:
    cylinder('pine tier',(0,0,z),r,1.7,'leaf',tree,r2=.04,vertices=24)
for k in range(35):
    a=k*2.4;z=.7+k*.115;r=1.6*(1-z/5.3)
    uv('tree ornament',(r*math.cos(a),r*math.sin(a),z),(.11,.11,.11),'gold' if k%2 else 'red',tree,12,6)
uv('tree top star',(0,0,5.2),(.25,.25,.35),'gold',tree)

def plate(parent,x,y,z=.0,r=.45):
    cylinder('gold rim platter',(x,y,z),r,.055,'gold',parent)
    cylinder('porcelain dish',(x,y,z+.035),r*.92,.04,'plate',parent)
def cake(parent,x,y,z):
    cylinder('chocolate cake',(x,y,z+.24),.40,.48,'chocolate',parent)
    cylinder('cream icing',(x,y,z+.49),.43,.11,'cream',parent)
    for a in range(7):uv('cake berries',(x+.27*math.cos(a*math.tau/7),y+.27*math.sin(a*math.tau/7),z+.58),(.07,.07,.07),'red',parent,12,6)
def pumpkin(parent,x,y,z):
    for a in range(8):
        ang=a*math.tau/8;uv('pumpkin lobe',(x+.18*math.cos(ang),y+.18*math.sin(ang),z+.26),(.22,.22,.28),'pumpkin',parent,12,6)
    cylinder('pumpkin stalk',(x,y,z+.57),.055,.20,'leaf',parent)
def bread(parent,x,y,z):
    uv('baked loaf',(x,y,z+.20),(.45,.29,.22),'bread',parent)
    for i in range(3):
        cut=cube('loaf score',(x-.20+i*.20,y-.08,z+.40),(.04,.28,.025),'cream',parent,bevel=.01);cut.rotation_euler[2]=-.3
def grapes(parent,x,y,z):
    for j in range(9):uv('grapes',(x+random.uniform(-.2,.2),y+random.uniform(-.2,.2),z+.1+j*.035),(.105,.105,.105),'purple',parent,12,6)
def apple(parent,x,y,z):
    uv('red apple',(x,y,z+.24),(.25,.24,.25),'red',parent)
    cylinder('apple stalk',(x,y,z+.50),.025,.12,'wood',parent,vertices=8)
def roast(parent,x,y,z):
    uv('golden roast',(x,y,z+.23),(.43,.31,.25),'bread',parent)
    for side in [-1,1]:uv('roast drumstick',(x+side*.34,y-.13,z+.19),(.15,.29,.14),'bread',parent)

tables=[]
for x in [-4.5,4.5]:
    root=empty('conjured feast table',(x,10,0));tables.append(root)
    cube('long banquet tabletop',(0,0,1.65),(2.8,18,.22),'wood',root,bevel=.06)
    cube('scarlet table runner',(0,0,1.785),(.75,17.9,.025),'scarlet',root)
    for dx in [-1.22,1.22]:cube('gold table edging',(dx,0,1.79),(.05,17.9,.035),'gold',root)
    for y in [-7,-2,3,7]:
        for dx in [-.95,.95]:cube('carved table leg',(dx,y,.8),(.19,.25,1.6),'edge',root,bevel=.04)
    for dx in [-1.85,1.85]:
        cube('long bench',(dx,0,.78),(.65,18,.16),'edge',root,bevel=.04)
    foods=[cake,pumpkin,bread,grapes,roast,apple,cake,bread,roast]
    for j,fn in enumerate(foods):
        yy=-7.8+j*1.85
        plate(root,.60 if j%2 else -.60,yy,1.81,.52)
        fn(root,.60 if j%2 else -.60,yy,1.88)
        for dx in [-1.08,1.08]:
            plate(root,dx,yy+.5,1.81,.23)
            cylinder('gold goblet stem',(dx,yy+.9,2.00),.035,.35,'gold',root,vertices=12)
            cylinder('goblet bowl',(dx,yy+.9,2.22),.14,.28,'gold',root,r2=.20,vertices=16)

print('Feast tables ready',flush=True)
# Sorting Hat with a crooked tip, furrowed eyes and an opening cloth mouth.
hat=empty('animated Sorting Hat',(0,3,2.55))
cylinder('sorting stool seat',(0,3,2.12),.85,.22,'wood')
for a in range(4):
    cylinder('sorting stool leg',(.58*math.cos(a*math.pi/2),3+.58*math.sin(a*math.pi/2),1.0),.08,2,'wood')
verts=[];faces=[];N=40
levels=[(-.05,1.22,0),(.05,1.2,0),(.15,.85,0),(.5,.75,0),(.95,.58,.02),(1.4,.43,.08),(1.8,.25,.22),(2.08,.12,.45),(2.25,.025,.76)]
for j,(z,r,cx) in enumerate(levels):
    for k in range(N):
        a=math.tau*k/N
        fold=1+.065*math.sin(5*a+j*.6)+.025*math.sin(11*a)
        verts.append((cx+r*math.cos(a)*fold,r*math.sin(a)*fold,z+.035*math.sin(a*4+j)))
for j in range(len(levels)-1):
    for k in range(N):faces.append((j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k))
mesh=bpy.data.meshes.new('creased hat cloth');mesh.from_pydata(verts,[],faces);mesh.update()
o=bpy.data.objects.new('iconic crooked Sorting Hat',mesh);bpy.context.collection.objects.link(o);attach(o,'hat',hat)
for p in mesh.polygons:p.use_smooth=True
torus('hat brim edging',(0,0,.04),1.21,.06,'hat_light',hat)
for side in [-1,1]:
    pts=[(side*.12,-.66,1.05),(side*.29,-.67,1.28),(side*.51,-.56,1.15)]
    curve('deep eyebrow fold',pts,'hat_light',.095,hat)
    eye=uv('hat eye shadow',(side*.29,-.652,1.05),(.21,.03,.055),'dark',hat);eye.rotation_euler[1]=side*.28
mouth=uv('talking cloth mouth',(0,-.745,.60),(.38,.036,.085),'dark',hat)
curve('hat smile fold',[(-.40,-.71,.65),(-.15,-.77,.48),(.12,-.77,.49),(.42,-.70,.65)],'hat_light',.055,hat)

print('Sorting Hat ready',flush=True)
# Floating candles occupy the whole hall.
candles=[]
for i in range(36):
    x=random.uniform(-7.5,7.5);y=random.uniform(-1,27);z=random.uniform(5.7,9.2)
    c=empty('floating candle',(x,y,z))
    cylinder('ivory flying candle',(0,0,0),.065,.65,'wax',c,vertices=12)
    cylinder('candle gold foot',(0,0,-.33),.09,.035,'gold',c,vertices=12)
    uv('candle flame',(0,0,.43),(.058,.058,.145),'flame',c,12,6)
    candles.append((c,Vector((x,y,z)),i*.77))

levitating=[]
for i,fn in enumerate([cake,pumpkin,bread,apple,grapes,roast]):
    r=empty('levitating feast dish')
    plate(r,0,0,0,.50);fn(r,0,0,.065)
    levitating.append((r,i))
book=empty('levitating spell book')
cube('book red cover',(0,0,-.05),(1.3,.9,.13),'scarlet',book,bevel=.05)
cube('book pages',(0,0,.035),(1.22,.82,.10),'cream',book,bevel=.04)
for side in [-1,1]:
    page=cube('open book leaf',(side*.31,0,.13),(.60,.78,.04),'cream',book,bevel=.01);page.rotation_euler[1]=side*.12
    for j in range(5):curve('spellbook ink',[(side*.08,-.27+j*.12,.18),(side*.54,-.27+j*.12,.18)],'hat',.012,book)

wand_roots=[]
for side,mat in [(-1,'wood'),(1,'hat_light')]:
    r=empty('flying spell wand')
    o=cylinder('tapered wand',(0,0,.75),.065,1.5,mat,r,r2=.018,vertices=16)
    for z in [.05,.18,.32]:torus('wand handle ring',(0,0,z),.065,.015,'gold',r)
    wand_roots.append((r,side))
bolts=[curve('wand lightning',[(0,0,0)]*12,mat,.026) for mat in ['cyan','spellgold']]
orb=uv('spell collision orb',(0,3,4.4),(.16,.16,.16),'cyan')

# A real hollow, gilded takeaway cup becomes the closing hero.
cup=empty('Hogwarts limited drink',(0,1.0,3))
v=[];fa=[];NN=48
for z,r in [(0,.47),(1.65,.66),(1.65,.61),(.08,.42)]:
    for k in range(NN):a=k*math.tau/NN;v.append((r*math.cos(a),r*math.sin(a),z))
for j in range(3):
    for k in range(NN):fa.append((j*NN+k,j*NN+(k+1)%NN,(j+1)*NN+(k+1)%NN,(j+1)*NN+k))
me=bpy.data.meshes.new('hollow paper cup');me.from_pydata(v,[],fa);me.update()
co=bpy.data.objects.new('gilded Hogwarts cup',me);bpy.context.collection.objects.link(co);attach(co,'cup',cup)
for p in me.polygons:p.use_smooth=True
torus('cup gold rim',(0,0,1.66),.64,.045,'gold',cup)
torus('cup gold base',(0,0,.08),.48,.026,'gold',cup)
liquid=cylinder('magical drink surface',(0,0,1.53),.605,.05,'liquid',cup,vertices=48)
text('cup Hogwarts lettering','HOGWARTS',(0,-.57,.98),.145,'gold',cup)
text('cup shield H','H',(0,-.585,.48),.42,'gold',cup)
for side in [-1,1]:curve('cup shield border',[(0,-.57,.22),(side*.32,-.51,.48),(side*.32,-.51,.78),(0,-.59,.87)],'gold',.025,cup)
steam=[]
for i in range(3):steam.append(curve('floating drink steam',[(0,0,0)]*14,'cream',.016,cup))

# Bake static geometry into a few meshes; animation controls remain separate.
# This preserves the authored scene while avoiding hundreds of draw objects per frame.
dynamic_curves=set(bolts+steam)
for ob in list(scene.objects):
    if (ob.type in {'CURVE','FONT'} and ob not in dynamic_curves) or (ob.type=='MESH' and len(ob.modifiers)):
        bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
        bpy.ops.object.convert(target='MESH')
def merge_meshes(objects):
    objects=[ob for ob in objects if ob.type=='MESH' and ob!=mouth and ob!=liquid and ob!=orb]
    if len(objects)<2:return
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:ob.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
for root in tables+[tree,hat,book,cup]+[c for c,_,_ in candles]+[r for r,_ in levitating]+[r for r,_ in wand_roots]:
    merge_meshes(list(root.children))
merge_meshes([ob for ob in list(scene.objects) if ob.parent is None])
print('Optimized scene meshes',flush=True)

bpy.ops.object.camera_add(location=(0,-18,7))
print('Props ready',flush=True)
camera=bpy.context.object;camera.name='cinematic Great Hall camera';scene.camera=camera
camera.data.lens=35
camera.data.clip_start=.05;camera.data.clip_end=200
def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)
def mix(a,b,t):return Vector(a).lerp(Vector(b),t)
shots=[(0,(0,-19,7.4),(0,8,3.2)),(5,(3.8,-8.5,5.6),(0,4,3.0)),(9,(0,-3.9,4.3),(0,3,3.45)),(14,(-5.6,-3.1,6.0),(0,4.2,3.8)),(18,(3,-5.5,5.2),(0,2.0,3.5)),(24,(0,-5.7,4.6),(-1.3,1.0,3.7))]
def project(p):
    q=world_to_camera_view(scene,camera,Vector(p));return [round(q.x*W,3),round((1-q.y)*H,3),q.z>0]
def hide(o,flag):
    o.hide_render=flag
    for c in o.children_recursive:c.hide_render=flag
def update(scene):
    t=(scene.frame_current-1)/FPS
    for a,b in zip(shots,shots[1:]):
        if a[0]<=t<=b[0]:
            u=smooth((t-a[0])/(b[0]-a[0]));camera.location=mix(a[1],b[1],u);target=mix(a[2],b[2],u);break
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    for i,r in enumerate(tables):r.location.z=-2.3*(1-smooth((t-.25-i*.4)/1.4))
    hat.location.z=2.4+.10*math.sin(t*1.5)+.70*smooth((t-11)/2)
    hat.rotation_euler=(.035*math.sin(t),.08*math.sin(t*.7),.17*math.sin(t*.75))
    mouth.scale.z=.055+.070*(.5+.5*math.sin(t*7)) if 5<t<10 else .065
    for c,base,p in candles:
        c.location=base+Vector((.12*math.sin(t*.6+p),.10*math.cos(t*.7+p),.25*math.sin(t*1.15+p)))
        c.rotation_euler=(.05*math.sin(t+p),.05*math.cos(t+p),0)
    lift=smooth((t-11.5)/2)
    for r,i in levitating:
        a=t*.5+i*math.tau/6
        r.location=(2.3*math.cos(a),4+2.0*math.sin(a),.1+lift*(2.3+.45*math.sin(t*1.4+i)))
        r.rotation_euler=(.12*math.sin(t+i),.12*math.cos(t+i),a)
        hide(r,t<11.3 or t>19.0)
    book.location=(1.1*math.cos(t*.8),3+math.sin(t*.8),4.8+.3*math.sin(t*1.4))
    book.rotation_euler=(.15,.2*math.sin(t),-t*.7)
    hide(book,t<11.4 or t>19.2)
    tips=[]
    for r,side in wand_roots:
        r.location=(side*(2.5+.15*math.sin(t*2)),1.4,4.0+.3*math.cos(t*1.6))
        target=Vector((0,3,4.5));r.rotation_euler=(target-r.location).to_track_quat('Z','Y').to_euler()
        hide(r,t<8.8 or t>16)
        tips.append(r.location+r.rotation_euler.to_matrix()@Vector((0,0,1.5)))
    burst=8.8<t<16
    center=Vector((0,3,4.5))
    for i,bolt in enumerate(bolts):
        bolt.hide_render=not burst
        for j,p in enumerate(bolt.data.splines[0].points):
            u=j/11;q=tips[i].lerp(center,u)
            q.x+=math.sin(j*2.1+t*19+i)*.10*math.sin(math.pi*u)
            q.z+=math.sin(j*1.7+t*23+i)*.09*math.sin(math.pi*u)
            p.co=(*q,1)
        bolt.data.bevel_depth=.012+.027*(.5+.5*math.sin(t*15+i))
    orb.hide_render=not burst
    orb.scale=(.14+.16*(.5+.5*math.sin(t*20)),)*3
    showcup=smooth((t-17.4)/1.4)
    hide(cup,t<17.4)
    cup.location=(0,1.0,1.4+showcup*1.2)
    cup.rotation_euler=(.025*math.sin(t),.04*math.sin(t*.6),.08*math.sin(t*.5))
    liquid.location.z=.20+1.33*smooth((t-18)/1.8)
    for i,s in enumerate(steam):
        for j,p in enumerate(s.data.splines[0].points):
            u=j/13;p.co=(.20*math.sin(u*math.tau+t*1.4+i)+.15*(i-1),.13*math.cos(u*5+t+i),1.7+u*.95,1)
    # Save the actual camera projection for composited glow and wand impacts.
    camera.matrix_world=Matrix.Translation(camera.location)@camera.rotation_euler.to_matrix().to_4x4()
    glows=[project(c.location+c.rotation_euler.to_matrix()@Vector((0,0,.43))) for c,_,_ in candles]
    data={'t':t,'candles':glows,'wand_tips':[project(q) for q in tips] if burst else [],'impact':project(center) if burst else None,'cup':project(cup.location+Vector((0,0,1.6))) if t>17.4 else None}
    (OUT/f'{scene.frame_current:04d}.json').write_text(json.dumps(data))

bpy.app.handlers.frame_change_pre.clear()
bpy.app.handlers.frame_change_pre.append(update)
update(scene)
print('Saving scene',flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'design/ticket3d/hogwarts_scene.blend'))
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if '--preview' in args:
    for f in [1,126,234,324,414]:
        scene.frame_set(f);scene.render.filepath=str(OUT/f'preview_{f:04d}.png');bpy.ops.render.render(write_still=True)
elif '--one' in args:
    scene.frame_set(126);scene.render.filepath=str(OUT/'preview_hat.png');bpy.ops.render.render(write_still=True)
else:
    scene.render.filepath=str(OUT/'')+'/'
    bpy.ops.render.render(animation=True)
print(json.dumps({'frames':FPS*SECONDS,'fps':FPS,'width':W,'height':H,'seconds':SECONDS,'output':str(OUT)}))
