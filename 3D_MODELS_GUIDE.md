# How to Use 3D Models in Your Site

## Supported Formats
- **GLTF** (.gltf) - Recommended, text-based format
- **GLB** (.glb) - Binary version of GLTF, also recommended
- These are the most common formats for web 3D models

## Steps to Add a 3D Model (e.g., a shirt)

### 1. Get or Create Your 3D Model
- **Free 3D Models**: 
  - [Sketchfab](https://sketchfab.com) - Search for "shirt" or any object
  - [Poly Haven](https://polyhaven.com/models)
  - [Free3D](https://free3d.com)
- **Create Your Own**: Use Blender, Maya, or other 3D software
- **Export**: Make sure to export as GLTF or GLB format

### 2. Place Your Model File
1. Put your model file (e.g., `shirt.gltf` or `shirt.glb`) in the `/public` folder
2. If your model has textures/images, place them in `/public` as well (GLTF will reference them)

### 3. Update the Code
In `/src/main.js`, find the section that loads the 3D model and uncomment it:

```javascript
createSpinningModel(
  modelContainer,
  '/shirt.gltf', // Change this to your file name
  {
    width: 400,
    height: 400,
    autoRotate: true,
    rotationSpeed: 0.01, // Adjust speed (higher = faster)
    backgroundColor: 0xffffff, // White background
    cameraPosition: { x: 0, y: 0, z: 5 } // Adjust camera distance
  }
)
```

### 4. Customize Options
- `width` / `height`: Size of the 3D viewer
- `autoRotate`: Set to `true` for automatic spinning
- `rotationSpeed`: How fast it spins (0.01 is slow, 0.05 is fast)
- `backgroundColor`: Background color (0xffffff = white, 0x000000 = black)
- `cameraPosition`: Adjust x, y, z to position the camera

### 5. Multiple Models
You can add multiple 3D models by creating multiple containers:

```javascript
// In your HTML
<div id="shirt-container" style="width: 300px; height: 300px;"></div>
<div id="pants-container" style="width: 300px; height: 300px;"></div>

// In your JavaScript
createSpinningModel(
  document.getElementById('shirt-container'),
  '/shirt.gltf',
  { width: 300, height: 300 }
)

createSpinningModel(
  document.getElementById('pants-container'),
  '/pants.gltf',
  { width: 300, height: 300 }
)
```

## Tips
- **File Size**: Keep models under 5MB for best performance
- **Optimization**: Use GLB format (binary) for smaller file sizes
- **Textures**: Make sure texture images are included if your model uses them
- **Positioning**: If your model appears too large/small or off-center, the loader automatically centers and scales it

## Example Model Sources
- Search "t-shirt 3d model gltf" on Sketchfab
- Many models are free to use with attribution
- Make sure to check the license before using

