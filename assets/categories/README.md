Place category images in subfolders named after category IDs (e.g. `devotional`, `actors`).

Naming convention (recommended):
- image files: `1.jpg`, `2.jpg`, ... `10.jpg` (or .png)
- Use consistent square images (400x400) for best results.

How to use:
- After adding images, update `src/utils/categoriesData.js` to replace the remote `uri` with a local `require` like:
  images: [ { id: 'dev_1', name: 'Ganesha', uri: require('../../assets/categories/devotional/1.jpg') }, ... ]

If you want, I can update `categoriesData.js` for you once you confirm which local images to use.