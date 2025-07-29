# Edited Image Preview Broken in Media Panel

## Issue Description
When an image is edited using the image edit feature (seededit), the resulting image is successfully processed and added to the media panel, but the preview appears broken.

## Console Output Analysis
```
✅ Image converted to base64 data URL for FAL API
🎨 Editing image with seededit: {prompt: 'make supermodel more beautiful ', ...}
✅ FAL API response: {
  "image": {
    "url": "https://v3.fal.media/files/penguin/RatEehgsjWheO6nDPjB_9_b3eaf0aa366d4e6ca6a6f73516e738bf.png",
    "content_type": "image/png",
    "file_name": "b3eaf0aa366d4e6ca6a6f73516e738bf.png",
    "file_size": 538478,
    "width": null,
    "height": null
  },
  "seed": 1485318318
}
🎯 Using direct mode with single image object
✅ Edited image automatically added to media: edited-seededit-make supermodel more beautiful-2025-07-29T01-48-29.png
```

## Key Observations
1. The FAL API successfully returns an image URL
2. The image is added to media with a proper filename
3. The preview still appears broken despite successful processing

## Potential Causes
1. **URL vs Base64 Mismatch**: The FAL API returns a URL, but the media panel might expect base64 data
2. **CORS Issues**: The external URL might have CORS restrictions preventing display
3. **Missing Image Data**: The response shows `width: null` and `height: null`
4. **Incorrect File Object Creation**: The File object might not be created properly from the URL

## Files to Investigate
- `/apps/web/src/lib/image-edit-client.ts` - Image editing client logic
- `/apps/web/src/components/editor/media-panel/views/adjustment.tsx` - Where edited images are added
- `/apps/web/src/stores/media-store.ts` - Media storage logic

## Next Steps
1. Check how the File object is created from the FAL API response
2. Verify if the image URL needs to be fetched and converted to blob/base64
3. Ensure proper handling of external URLs in the media preview component
4. Add error handling for failed image loads