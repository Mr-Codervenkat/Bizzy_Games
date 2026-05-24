export function getImageSource(image) {
  if (!image) {
    return null;
  }

  if (image.source) {
    return image.source;
  }

  if (typeof image === 'number') {
    return image;
  }

  if (typeof image.uri === 'string' && image.uri.length > 0) {
    return { uri: image.uri };
  }

  return null;
}
