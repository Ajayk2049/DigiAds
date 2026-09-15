/**
 * Inspect video file locally using HTML5 Video element to extract duration and dimensions.
 */
export async function inspectVideoMetadata(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve({
        duration: video.duration || 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0
      });
    };
    video.onerror = () => resolve({ duration: 0, width: 0, height: 0 });
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Determine resolution or orientation mismatch warnings based on target display type.
 */
export function checkVideoResolutionMismatch(videoMeta, targetDeviceType) {
  if (!videoMeta.width || !videoMeta.height) return null;

  if (targetDeviceType === 'screen') {
    const isLowRes = videoMeta.width < 1280 || videoMeta.height < 720;
    const isOrientationMismatch = videoMeta.height > videoMeta.width;
    if (isLowRes || isOrientationMismatch) {
      return {
        width: videoMeta.width,
        height: videoMeta.height,
        targetDeviceType: 'screen',
        recommended: '1920 × 1080 (16:9 Landscape Full HD)',
        isLowRes,
        isOrientationMismatch,
        mismatchDesc: isOrientationMismatch
          ? 'You uploaded a Vertical / Portrait video for a Horizontal Wall Screen. It will be centered with black letterbox bars on the left and right.'
          : null
      };
    }
  } else if (targetDeviceType === 'tablet') {
    const isLowRes = videoMeta.width < 720 || videoMeta.height < 1280;
    const isOrientationMismatch = videoMeta.width > videoMeta.height;
    if (isLowRes || isOrientationMismatch) {
      return {
        width: videoMeta.width,
        height: videoMeta.height,
        targetDeviceType: 'tablet',
        recommended: '1080 × 1920 (9:16 Portrait Full HD)',
        isLowRes,
        isOrientationMismatch,
        mismatchDesc: isOrientationMismatch
          ? 'You uploaded a Horizontal / Landscape video for a Vertical Tabletop Tablet. It will be centered with black letterbox bars on top and bottom.'
          : null
      };
    }
  }

  return null;
}
