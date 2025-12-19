export async function getSignedMediaUrl(key) {
  console.log('Mock getSignedMediaUrl called with', key);
  return `https://mock-s3/${key}`;
}

export async function listDropMedia(dropId) {
  console.log('Mock listDropMedia called with', dropId);
  return [];
}
