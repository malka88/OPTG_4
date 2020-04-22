var camera, scene, renderer;
var container;
var geometry;

var clock = new THREE.Clock();

//var keyboard = new THREEx.KeyboardState();

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

init();
animate();


function init()
{
    container = document.getElementById( 'container' );
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 40000 );
    

    camera.position.set(n/2, n/2, n*1.5);

    camera.lookAt(new THREE.Vector3( n/2, 0.0, n/2));


    renderer = new THREE.WebGLRenderer( { antialias: false } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor(  0x444444, 1);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );

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
    terrainGen();
    GUI();
    loadModel('models/', 'Cyprys_House.obj', 'Cyprys_House.mtl', 1, 'house');
    loadModel('models/', 'Bush1.obj', 'Bush1.mtl', 1, 'bush');
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
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function render() 
{
    renderer.render( scene, camera ); 
}

function animate() 
{
    var delta = clock.getDelta();

    if (brushDirection != 0)
    {
        sculpt(brushDirection, delta);
    }

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
        sx: 0, sy: 0, sz: 0,
        brush: false,
        addBush: function() { addMesh('bush') },
        addHouse: function() { addMesh('house') }
        //del: function() { delMesh() }
    };
    var folder1 = gui.addFolder('Scale');
    var meshSX = folder1.add( params, 'sx' ).min(1).max(100).step(1).listen();
    var meshSY = folder1.add( params, 'sy' ).min(1).max(100).step(1).listen();
    var meshSZ = folder1.add( params, 'sz' ).min(1).max(100).step(1).listen();
    folder1.open();
    //meshSX.onChange(function(value) {…});
    //meshSY.onChange(function(value) {…});
    //meshSZ.onChange(function(value) {…});
    var cubeVisible = gui.add( params, 'brush' ).name('brush').listen();
    cubeVisible.onChange(function(value)
    {
        brVis = value;
        cursor3D.visible = value;
        circle.visible = value;
    });
    gui.add( params, 'addHouse' ).name( "add house" );
    gui.add( params, 'addBush' ).name( "add bush" );
    //gui.add( params, 'del' ).name( "delete" );

    gui.open();
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