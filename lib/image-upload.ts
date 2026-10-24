// Client-side image compression before upload. Resizes to a max dimension
// and re-encodes as JPEG at moderate quality so a phone photo (often 3-5MB)
// becomes a manageable size before it's sent anywhere - either as a base64
// fallback (small org logos) or before uploading to Cloudinary.
export function compressImage(
  file: File,
  maxDimension = 1000,
  quality = 0.8,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: mime });
}

interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

// Real object storage upload: compress client-side, get a signed
// upload slot from our backend (which holds the vendor's or the
// shared fallback's Cloudinary secret - never sent to the browser),
// then upload directly to Cloudinary. Returns the final public URL.
export async function uploadToCloudinary(
  file: File,
  getSignature: () => Promise<UploadSignature>,
): Promise<string> {
  const compressedDataUrl = await compressImage(file);
  const blob = dataUrlToBlob(compressedDataUrl);
  const sig = await getSignature();

  const formData = new FormData();
  formData.append("file", blob, file.name);
  formData.append("api_key", sig.apiKey);
  formData.append("timestamp", String(sig.timestamp));
  formData.append("signature", sig.signature);
  formData.append("folder", sig.folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    { method: "POST", body: formData },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed: ${text}`);
  }
  const data = await res.json();
  return data.secure_url as string;
}
