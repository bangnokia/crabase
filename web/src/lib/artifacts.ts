export function isArtifactUrl(url: string): boolean {
  return /^\/files\/[a-f0-9]{16}\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(url);
}

export function isImageArtifact(url: string): boolean {
  return isArtifactUrl(url) && /\.(png|jpe?g|gif|webp|avif)$/i.test(url);
}
