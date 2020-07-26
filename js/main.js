var camera, scene, renderer, cameraOrtho, sceneOrtho;
var loader = new THREE.TextureLoader();
var container;
var geometry;

var clock = new THREE.Clock();

var keyboard = new THREEx.KeyboardState();

var n = 100;
var cursor3D, circle;
var radius = 10;

var brushDirection = 0;

var mouse = { x: 0, y: 0 }; 
var targetList = [];
var objectsList = [];

var gui = new dat.GUI();
gui.width = 200;

var brVis = false;

var models = new Map();

var selected = null;
var sprt;
var g = new THREE.Vector3(0, -9.8, 0);
var particles = [];
var MAX_PARTICLES = 1000;
var PARTICLES_PER_SECOND = 100;
var partVis = false;
var sprtBtn = [];

var uWind = 0;
var wind = new THREE.Vector3(0.0, 0.0, 0.0);

var rainMat = null;

var a = 0.0;

init();
animate();


function init()
{
    container = document.getElementById( 'container' );
    scene = new THREE.Scene();
    sceneOrtho = new THREE.Scene();

    var width = window.innerWidth;
	var height = window.innerHeight;

    cameraOrtho = new THREE.OrthographicCamera( - width / 2, width / 2, height / 2, - height / 2, 1, 10 );
    cameraOrtho.position.z = 10;

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 40000 );

    //camera.position.set(n/2, n/2, n*1.5);
    //camera.lookAt(new THREE.Vector3( n/2, 0.0, n/2));

    camera.position.set(n, n, 0);
    camera.lookAt(new THREE.Vector3(n/2, 0, n/2));


    renderer = new THREE.WebGLRenderer( { antialias: false } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor(  0x444444, 1);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );

    renderer.autoClear = false;

    renderer.domElement.addEventListener('mousedown',onDocumentMouseDown,false);
    renderer.domElement.addEventListener('mouseup',onDocumentMouseUp,false);
    renderer.domElement.addEventListener('mousemove',onDocumentMouseMove,false);
    renderer.domElement.addEventListener('wheel',onDocumentMouseScroll,false);
    renderer.domElement.addEventListener("contextmenu",
                                        function (event)
                                        {
                                        event.preventDefault();
                                        });

    var light = new THREE.DirectionalLight( 0xffffff );
    light.position.set(n, n, n/2);

    light.target = new THREE.Object3D();
    light.target.position.set(n/2, 0, n/2);
    scene.add(light.target);
    light.castShadow = true;
    light.shadow = new THREE.LightShadow(new THREE.PerspectiveCamera(60, 1, 10, 1000));
    light.shadow.bias = 0.0001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    scene.add(light);

    var helper = new THREE.CameraHelper(light.shadow.camera);
    add3DCursor();
    addCircle();
    crSky();
    terrainGen();
    GUI();
    loadModel('models/', 'Cyprys_House.obj', 'Cyprys_House.mtl', 1, 'house');
    loadModel('models/', 'Bush1.obj', 'Bush1.mtl', 1, 'bush');

    //addButtons();
    sprtBtn.push(addButtons('house'));
    sprtBtn.push(addButtons('bush'));

    rainMat = createSpriteMaterial('pics/b084afa2b8c082060b58360e309c11a5.jpg');
}

function crSky()
{
    var loader = new THREE.TextureLoader();
    var geometry = new THREE.SphereGeometry( 1000, 32, 32 );
    var tex = loader.load( 'pics/sky.jpg' );
    
    tex.minFilter = THREE.NearestFilter;

    var material = new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.DoubleSide
    });

    sphere = new THREE.Mesh( geometry, material );

    scene.add( sphere );
}

function terrainGen()
{
    geometry = new THREE.Geometry();

    for(var i = 0; i < n; i++)
    for(var j = 0; j < n; j++)
    {
        geometry.vertices.push(new THREE.Vector3(i, 0.0, j));
    }

    for(var i = 0; i < (n-1); i++)
        for(var j = 0; j < (n-1); j++)
        {
            geometry.faces.push(new THREE.Face3(i+j*n, (i+1)+j*n, (i+1)+(j+1)*n));
            geometry.faces.push(new THREE.Face3(i+j*n, (i+1)+(j+1)*n, (i)+(j+1)*n));
                
            geometry.faceVertexUvs[0].push([new THREE.Vector2((i)/(n-1), (j)/(n-1)),
                new THREE.Vector2((i+1)/(n-1), (j)/(n-1)),
                new THREE.Vector2((i+1)/(n-1), (j+1)/(n-1))]);

            geometry.faceVertexUvs[0].push([new THREE.Vector2((i)/(n-1), (j)/(n-1)),
                new THREE.Vector2((i+1)/(n-1), (j+1)/(n-1)),
                new THREE.Vector2((i)/(n-1), (j+1)/(n-1))]);
        }

    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    var loader = new THREE.TextureLoader();
    var tex = loader.load( 'pics/grasstile.jpg');

    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; 
    tex.repeat.set( 4, 4 );

    var mat = new THREE.MeshLambertMaterial({
        map:tex,
        wireframe: false,
        side:THREE.DoubleSide
    });

    var mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(0.0, 0.0, 0.0);
    mesh.receiveShadow = true;
    targetList.push(mesh);
    scene.add(mesh);
}

function onWindowResize()
{
    var width = window.innerWidth;
    var height = window.innerHeight;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    cameraOrtho.left = - width / 2;
	cameraOrtho.right = width / 2;
	cameraOrtho.top = height / 2;
	cameraOrtho.bottom = - height / 2;
	cameraOrtho.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function render() 
{
    renderer.clear();
    renderer.render( scene, camera ); 
    renderer.clearDepth();
	renderer.render( sceneOrtho, cameraOrtho );
}

function animate() 
{
    var delta = clock.getDelta();

    if (brushDirection != 0)
    {
        sculpt(brushDirection, delta);
    }

    if (keyboard.pressed("left")) 
    {
        a += 0.05;
        var x = n/2 + n/2 * Math.cos(a);
        var z = n/2 + n/2 * Math.sin(a);

        camera.position.set(x, n, z);
        camera.lookAt(new THREE.Vector3(n/2, 0, n/2));
    }

    if (keyboard.pressed("right"))
    {
        a -= 0.05;
        var x = n/2 + n/2 * Math.cos(a);
        var z = n/2 + n/2 * Math.sin(a);

        camera.position.set(x, n, z);        
        camera.lookAt(new THREE.Vector3(n/2, 0, n/2));
    }

    emitter(delta);

    requestAnimationFrame( animate );
    render();
}

function loadModel(path, oname, mname, s, name)
{
    var onProgress = function(xhr) {
        if(xhr.lengthComputable) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log(Math.round(percentComplete, 2) + '% downloaded');
        }
    };

    var onError = function(xhr) {};

    var mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath(path);
    mtlLoader.load(mname, function(materials)
    {
        materials.preload(); 
        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);

        objLoader.setPath(path);

        objLoader.load(oname, function(object)
        {
            object.castShadow = true;
            object.traverse(function(child)
            {
                if(child instanceof THREE.Mesh)
                {
                    child.castShadow = true;
                    child.parent = object;
                }
            });

            object.parent = object;
                var x = Math.random() * n;
                var z = Math.random() * n;
                var y = geometry.vertices[Math.round(z) + Math.round(x) * n].y;

                object.position.x = x;
                object.position.y = y;
                object.position.z = z;

                object.scale.set(s, s, s);
                //scene.add(object);
                models.set(name, object);
                //models.push(object);
            
        }, onProgress, onError);
    });
}

function add3DCursor()
{
    var geometry = new THREE.CylinderGeometry(1.5, 0, 5, 64);
    var cyMaterial = new THREE.MeshLambertMaterial({color: 0x888888});
    cursor3D = new THREE.Mesh(geometry, cyMaterial);

    cursor3D.visible = false;

    scene.add(cursor3D);
}

function addCircle()
{
    var material = new THREE.LineBasicMaterial( { color: 0xffff00 } );
    var segments = 64;
    var circleGeometry = new THREE.CircleGeometry( 1, segments );
    circleGeometry.vertices.shift();

    for(var i = 0; i < circleGeometry.vertices.length; i++)
    {
        circleGeometry.vertices[i].z = circleGeometry.vertices[i].y;
        circleGeometry.vertices[i].y = 0;
    }

    circle = new THREE.Line( circleGeometry, material );

    circle.scale.set(radius, 1, radius);

    circle.visible = false;

    scene.add( circle ); 
}

function onDocumentMouseScroll( event ) 
{
    if(brVis == true)
    {
        if(radius > 1)
            if(event.wheelDelta < 0)
                radius--;
        
        if(radius < 40)
            if(event.wheelDelta > 0)
                radius++;

        circle.scale.set(radius, 1, radius);
    }
}

function onDocumentMouseMove( event )
{
    var mpos = {};

    mpos.x = event.clientX - (window.innerWidth / 2);
    mpos.y = (window.innerHeight / 2) - event.clientY;
    if(sprtBtn[0] != null)
        hitButton(mpos, sprtBtn[0]);
    if(sprtBtn[1] != null)
        hitButton(mpos, sprtBtn[1]);

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
    vector.unproject(camera);
    var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
    var intersects = ray.intersectObjects( targetList );

    if(brVis == true)
    {
        if ( intersects.length > 0 )
        {
            //console.log(intersects[0]);
            if(cursor3D != null)
            {
                cursor3D.position.copy(intersects[0].point);
                cursor3D.position.y += 2.5;
            }
            if(circle != null)
            {
                circle.position.copy(intersects[0].point);
                circle.position.y = 0;

                for (var i = 0; i < circle.geometry.vertices.length; i++)
                {
                    var pos = new THREE.Vector3();
                    pos.copy(circle.geometry.vertices[i]);
                    pos.applyMatrix4(circle.matrixWorld);
            
                    var x = Math.round(pos.x);
                    var z = Math.round(pos.z);

                    if(x >= 0 && x < n && z >= 0 && z < n)
                    {
                        var y = geometry.vertices[z+x*n].y;
                        circle.geometry.vertices[i].y = y + 0.03;
                    } else
                    {
                        circle.geometry.vertices[i].y = 0;
                    }
                }
            
                circle.geometry.verticesNeedUpdate = true; 
            }
        }
    }
    else
    {
        if ( intersects.length > 0 )
        {
            if(selected != null){
                var oldPos = new THREE.Vector3();

                oldPos.copy(selected.position);

                selected.position.copy(intersects[0].point);
                selected.userData.box.setFromObject(selected);
                var pos = new THREE.Vector3();
                selected.userData.box.getCenter(pos);
                selected.userData.obb.position.copy(pos);
                selected.userData.cube.position.copy(pos);

                for(var i = 0; i < objectsList.length; i++)
                {
                    if(selected.userData.cube != objectsList[i])
                    {
                        objectsList[i].material.visible = false;
                        if(intersect(selected.userData, objectsList[i].userData.model.userData) == true)
                        {
                            objectsList[i].material.visible = true;

                            if(selected != null)
                            {
                                selected.position.copy(oldPos);
                                selected.userData.box.setFromObject(selected);
                                selected.userData.box.getCenter(pos);
                                selected.userData.obb.position.copy(pos);
                                selected.userData.cube.position.copy(pos);
                            }
                        }
                    }
                }
            }
        }
    }
}

function onDocumentMouseDown( event )
{
    if(brVis == true)
    {
        if (event.which == 1)
            brushDirection = 1;

        if (event.which == 3)
            brushDirection = -1;
    } else
    { 
        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
        var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
        vector.unproject(camera);
        var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
        var intersects = ray.intersectObjects(objectsList, true);

        if ( intersects.length > 0 )
        {
            selected = intersects[0].object.userData.model;
            selected.userData.cube.material.visible = true;
        }
    }
}

function onDocumentMouseUp( event )
{
    if(brVis == true)
        brushDirection = 0;
    else
    {
        var mpos = {};

        mpos.x = event.clientX - (window.innerWidth / 2);
        mpos.y = (window.innerHeight / 2) - event.clientY;

        if(sprtBtn[0] != null){
        hitButton(mpos, sprtBtn[0]);
        clickButton(mpos, sprtBtn[0])
        }
        if(sprtBtn[1] != null){
        hitButton(mpos, sprtBtn[1]);
        clickButton(mpos, sprtBtn[1])
        }

        selected.userData.cube.material.visible = false;
        selected = null;
    }
}

function sculpt(dir, delta)
{
    for (var i = 0; i < geometry.vertices.length; i++)
    {
        var x2 = geometry.vertices[i].x;
        var z2 = geometry.vertices[i].z;
        var r = radius;
        var x1 = cursor3D.position.x;
        var z1 = cursor3D.position.z;

        var h = r*r-((x2-x1)*(x2-x1)+(z2-z1)*(z2-z1));

        if (h > 0)
        {
            geometry.vertices[i].y += Math.sqrt(h) * delta * dir;
        }
    }

    geometry.computeFaceNormals();
    geometry.computeVertexNormals(); 
    geometry.verticesNeedUpdate = true; 
    geometry.normalsNeedUpdate = true;
}

function GUI()
{
    var params =
    {
        Rotate: 0, ScaleX: 0, ScaleY: 0, ScaleZ : 0, wind: 0, rain: false,
        brush: false,
        addBush: function() { addMesh('bush') },
        addHouse: function() { addMesh('house') },
        del: function() { delMesh() }
    };

    var meshWIND = gui.add( params, 'wind' ).min(-100).max(100).step(1).listen();
    meshWIND.onChange(function(value) {
        xwind = value;
        wind.set(xwind, 0, 0);
    });

    var folder1 = gui.addFolder('Transformations');
    var meshR = folder1.add( params, 'Rotate' ).min(1).max(360).step(1).listen();
    var meshSX = folder1.add( params, 'ScaleX' ).min(1).max(100).step(0.5).listen();
    var meshSY = folder1.add( params, 'ScaleY' ).min(1).max(100).step(0.5).listen();
    var meshSZ = folder1.add( params, 'ScaleZ' ).min(1).max(100).step(0.5).listen();
    folder1.open();
    meshSX.onChange(function(value) {
        if (selected != null)
        {
            selected.scale.x = value;
            selected.userData.cube.scale.x = value*2;
            selected.userData.box.setFromObject(selected);

            var pos = new THREE.Vector3();

            selected.userData.box.getCenter(pos);
            selected.userData.cube.position.copy(pos);
            selected.userData.obb.position.copy(pos); 
        }
    });
    meshSY.onChange(function(value) {
        if (selected != null)
        {
            selected.scale.y = value;
            selected.userData.cube.scale.y = value*2;
            selected.userData.box.setFromObject(selected);

            var pos = new THREE.Vector3();

            selected.userData.box.getCenter(pos);
            selected.userData.cube.position.copy(pos);
            selected.userData.obb.position.copy(pos); 
        }
    });
    meshSZ.onChange(function(value) {
        if (selected != null)
        {
            selected.scale.z = value;
            selected.userData.cube.scale.z = value*2;
            selected.userData.box.setFromObject(selected);

            var pos = new THREE.Vector3();

            selected.userData.box.getCenter(pos);
            selected.userData.cube.position.copy(pos);
            selected.userData.obb.position.copy(pos); 
        }
    });
    meshR.onChange(function(value) {
        if (selected != null && brVis == false)
        {
            selected.rotation.set(0, value * 0.01, 0);
            selected.userData.cube.rotation.set(0, value * 0.01, 0);

            selected.userData.box.setFromObject(selected);

            var pos = new THREE.Vector3();

            selected.userData.box.getCenter(pos);
            selected.userData.cube.position.copy(pos);
            selected.userData.obb.position.copy(pos); 

        }
    });
    //meshSZ.onChange(function(value) {…});
    var cubeVisible = gui.add( params, 'brush' ).name('brush').listen();
    cubeVisible.onChange(function(value)
    {
        brVis = value;
        cursor3D.visible = value;
        circle.visible = value;
    });

    var particlesVisible = gui.add( params, 'rain' ).name('rain').listen();
    particlesVisible.onChange(function(value)
    {
        partVis = value;
    });

    gui.add( params, 'addHouse' ).name( "Add house" );
    gui.add( params, 'addBush' ).name( "Add bush" );
    gui.add( params, 'del' ).name( "Delete" );

    gui.open();
}

function delMesh()
{
    if (selected != null)
    {
        scene.remove(selected);
        scene.remove(selected.userData.cube);

        for (var i = 0; i < objectsList.length; i++) {
            if (objectsList[i] == selected)
            {
                objectsList[i].userData.cube.material.visible = false;
                scene.remove(objectsList[i]);
                selected = null;
            }
        }
    }
}

function addMesh(name)
{
    var model = models.get(name).clone();
    var box = new THREE.Box3();

    box.setFromObject(model);
    model.userData.box = box;

    var geometry = new THREE.BoxGeometry(1, 1, 1);
    var material = new THREE.MeshBasicMaterial({color:0xffff00, wireframe: true});
    var cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    cube.material.visible = false;

    var pos = new THREE.Vector3();
    box.getCenter(pos);
    var size = new THREE.Vector3();
    box.getSize(size);
    cube.position.copy(pos);
    cube.scale.set(size.x, size.y, size.z);

    model.userData.cube = cube;
    cube.userData.model = model;

    var obb = {};
    obb.basis = new THREE.Matrix4();
    obb.halfSize = new THREE.Vector3();
    obb.position = new THREE.Vector3();
    box.getCenter(obb.position);
    box.getSize(obb.halfSize).multiplyScalar(0.5);
    obb.basis.extractRotation(model.matrixWorld);

    model.userData.obb = obb;

    objectsList.push(cube);
    scene.add(model);
}

function intersect(ob1, ob2)
{
    var xAxisA = new THREE.Vector3();
    var yAxisA = new THREE.Vector3();
    var zAxisA = new THREE.Vector3();
    var xAxisB = new THREE.Vector3();
    var yAxisB = new THREE.Vector3();
    var zAxisB = new THREE.Vector3();
    var translation = new THREE.Vector3();
    var vector = new THREE.Vector3();

    var axisA = [];
    var axisB = [];
    var rotationMatrix = [ [], [], [] ];
    var rotationMatrixAbs = [ [], [], [] ];
    var _EPSILON = 1e-3;

    var halfSizeA, halfSizeB;
    var t, i;

    ob1.obb.basis.extractBasis( xAxisA, yAxisA, zAxisA );
    ob2.obb.basis.extractBasis( xAxisB, yAxisB, zAxisB );

    axisA.push( xAxisA, yAxisA, zAxisA );
    axisB.push( xAxisB, yAxisB, zAxisB );
    vector.subVectors( ob2.obb.position, ob1.obb.position );
    for ( i = 0; i < 3; i++ )
    {
        translation.setComponent( i, vector.dot( axisA[ i ] ) );
    }
    for ( i = 0; i < 3; i++ )
    {
        for ( var j = 0; j < 3; j++ )
        {
            rotationMatrix[ i ][ j ] = axisA[ i ].dot( axisB[ j ] );
            rotationMatrixAbs[ i ][ j ] = Math.abs( rotationMatrix[ i ][ j ] ) + _EPSILON;
        }
    }
    for ( i = 0; i < 3; i++ )
    {
        vector.set( rotationMatrixAbs[ i ][ 0 ], rotationMatrixAbs[ i ][ 1 ], rotationMatrixAbs[ i ][ 2 ]
        );
        halfSizeA = ob1.obb.halfSize.getComponent( i );
        halfSizeB = ob2.obb.halfSize.dot( vector );
        
        if ( Math.abs( translation.getComponent( i ) ) > halfSizeA + halfSizeB )
        {
            return false;
        }
    }
    for ( i = 0; i < 3; i++ )
    {
        vector.set( rotationMatrixAbs[ 0 ][ i ], rotationMatrixAbs[ 1 ][ i ], rotationMatrixAbs[ 2 ][ i ] );
        halfSizeA = ob1.obb.halfSize.dot( vector );
        halfSizeB = ob2.obb.halfSize.getComponent( i );
        vector.set( rotationMatrix[ 0 ][ i ], rotationMatrix[ 1 ][ i ], rotationMatrix[ 2 ][ i ] );
        t = translation.dot( vector );
        if ( Math.abs( t ) > halfSizeA + halfSizeB )
        {
            return false;
        }
    }
    halfSizeA = ob1.obb.halfSize.y * rotationMatrixAbs[ 2 ][ 0 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 1 ][ 0 ];
    halfSizeB = ob2.obb.halfSize.y * rotationMatrixAbs[ 0 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 0 ][ 1 ];
    t = translation.z * rotationMatrix[ 1 ][ 0 ] - translation.y * rotationMatrix[ 2 ][ 0 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    halfSizeA = ob1.obb.halfSize.y * rotationMatrixAbs[ 2 ][ 1 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 1 ][ 1 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 0 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 0 ][ 0 ];
    t = translation.z * rotationMatrix[ 1 ][ 1 ] - translation.y * rotationMatrix[ 2 ][ 1 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    halfSizeA = ob1.obb.halfSize.y * rotationMatrixAbs[ 2 ][ 2 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 1 ][ 2 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 0 ][ 1 ] + ob2.obb.halfSize.y *
    rotationMatrixAbs[ 0 ][ 0 ];
    t = translation.z * rotationMatrix[ 1 ][ 2 ] - translation.y * rotationMatrix[ 2 ][ 2 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 2 ][ 0 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 0 ][ 0 ];
    halfSizeB = ob2.obb.halfSize.y * rotationMatrixAbs[ 1 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 1 ][ 1 ];
    t = translation.x * rotationMatrix[ 2 ][ 0 ] - translation.z * rotationMatrix[ 0 ][ 0 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 2 ][ 1 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 0 ][ 1 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 1 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 1 ][ 0 ];
    t = translation.x * rotationMatrix[ 2 ][ 1 ] - translation.z * rotationMatrix[ 0 ][ 1 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 2 ][ 2 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 0 ][ 2 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 1 ][ 1 ] + ob2.obb.halfSize.y *
    rotationMatrixAbs[ 1 ][ 0 ];
    t = translation.x * rotationMatrix[ 2 ][ 2 ] - translation.z * rotationMatrix[ 0 ][ 2 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 1 ][ 0 ] + ob1.obb.halfSize.y *
    rotationMatrixAbs[ 0 ][ 0 ];
    halfSizeB = ob2.obb.halfSize.y * rotationMatrixAbs[ 2 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 2 ][ 1 ];
    t = translation.y * rotationMatrix[ 0 ][ 0 ] - translation.x * rotationMatrix[ 1 ][ 0 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 1 ][ 1 ] + ob1.obb.halfSize.y *
    rotationMatrixAbs[ 0 ][ 1 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 2 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 2 ][ 0 ];
    t = translation.y * rotationMatrix[ 0 ][ 1 ] - translation.x * rotationMatrix[ 1 ][ 1 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 1 ][ 2 ] + ob1.obb.halfSize.y *
    rotationMatrixAbs[ 0 ][ 2 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 2 ][ 1 ] + ob2.obb.halfSize.y *
    rotationMatrixAbs[ 2 ][ 0 ];
    t = translation.y * rotationMatrix[ 0 ][ 2 ] - translation.x * rotationMatrix[ 1 ][ 2 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
        return false;
    }
    return true;
}

function addButton(name1, name2, click)
{
    var type;

    if(name1 == 'models/l68717-cyprys-house-23761.jpg')
        type = 'house';
    if(name2 == 'models/l99380-bush-84314.png')
        type = 'bush';

    var texture1 = loader.load(name1);
    var material1 = new THREE.SpriteMaterial( { map: texture1 } );

    var texture2 = loader.load(name2);
    var material2 = new THREE.SpriteMaterial( { map: texture2 } );

        sprite = new THREE.Sprite( material1 );
        sprite.center.set( 0.0, 1.0 );
        sprite.scale.set( 128, 100, 1 );

        sprite.position.set(0, 0, 1);

        sceneOrtho.add(sprite);
        updateHUDSprites(sprite);

        var SSprite = {};
        SSprite.sprite = sprite;
        SSprite.mat1 = material1;
        SSprite.mat2 = material2;
        SSprite.click = click;
        SSprite.type = type;

        if(type == "house")
        sprite.position.set(-window.innerWidth / 2, window.innerHeight / 2.5, 1);

        if(type == "bush")
        sprite.position.set(-window.innerWidth / 2, window.innerHeight / 2, 1);

        return SSprite;
}

function updateHUDSprites(sprite) {

    var width = window.innerWidth / 2;
    var height = window.innerHeight / 2;

    sprite.position.set( -width, height, 1 ); // center

}

function addButtons(name)
{
    if(name == 'house')
        sprt = addButton('models/l68717-cyprys-house-23761.jpg', 'models/l68717-cyprys-house-23761.jpg', sprt1Click);

    if(name == 'bush')
        sprt = addButton('models/l99380-bush-84314.png', 'models/l99380-bush-84314.png', sprt2Click);

    return sprt;
}

function hitButton(mPos, sprite)
{
    var pw = sprite.sprite.position.x;
    var ph = sprite.sprite.position.y;
    var sw = pw + sprite.sprite.scale.x;
    var sh = ph - sprite.sprite.scale.y;

    if(mPos.x > pw && mPos.x < sw)
    {
        if(mPos.y < ph && mPos.y > sh)
        {
            sprite.sprite.material = sprite.mat2;
        }
        else
            sprite.sprite.material = sprite.mat1;
    }
    else sprite.sprite.material = sprite.mat1;
}

function clickButton(mPos, sprite)
{
    var pw = sprite.sprite.position.x;
    var ph = sprite.sprite.position.y;
    var sw = pw + sprite.sprite.scale.x;
    var sh = ph - sprite.sprite.scale.y;

    if(mPos.x > pw && mPos.x < sw)
    {
        if(mPos.y < ph && mPos.y > sh)
        {
            sprite.click();
        }
    }
}

function sprt1Click()
{
    addMesh('house');
}

function sprt2Click()
{
    addMesh('bush');
}

function createSpriteMaterial(name)
{
    var texture = loader.load(name);
    var material = new THREE.SpriteMaterial( { map: texture } );

    return material;
}

function addSpriteR(mat, pos, lifetime)
{
    sprite = new THREE.Sprite( mat );
    sprite.center.set( 0.5, 0.5 );
    sprite.scale.set( 1.5, 1.5, 1 );

    sprite.position.copy(pos);

    scene.add(sprite);

    var SSprite = {};
    SSprite.sprite = sprite;
    SSprite.v = new THREE.Vector3(0, 0, 0);
    SSprite.m = (Math.random() * 0.1) + 0.01;
    SSprite.lifetime = lifetime;

    return SSprite;
}

function emitter(delta)
{
    var current_particles = Math.ceil(PARTICLES_PER_SECOND * delta);

    for(var i = 0; i < current_particles; i++)
    {
        if(particles.length < MAX_PARTICLES)
        {
            var x = Math.random()*n;
            var z = Math.random()*n;

            var lifetime = (Math.random()*2) + 3;

            var pos = new THREE.Vector4(x, 150, z);
            var particle = addSpriteR(rainMat, pos, lifetime);
            particles.push(particle);
        }
    }

    for(var i = 0; i < particles.length; i++)
    {
        particles[i].lifetime -= delta;
        if(particles[i].lifetime <= 0)
        {
            scene.remove(particles[i].sprite);
            particles.splice(i, 1);
            continue;
        }
        var gs = new THREE.Vector3();
        gs.copy(g);

        gs.multiplyScalar(particles[i].m);
        gs.multiplyScalar(delta);

        particles[i].v.add(gs);
        particles[i].sprite.position.add(particles[i].v);
    }

    for (var i = 0; i < particles.length; i++)
    {
        if (partVis == true)
            particles[i].sprite.visible = true;
        else
            particles[i].sprite.visible = false;

        var v = new THREE.Vector3(0, 0, 0);
        var w = new THREE.Vector3(0, 0, 0);

        w.copy(wind);
        w.multiplyScalar(delta);

        v.copy(particles[i].v);
        v.add(w);

        particles[i].sprite.position.add(v);
    }
}