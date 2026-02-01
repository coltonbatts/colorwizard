'use client';

import { useState, useRef } from 'react';

interface ReferenceImage {
    id: string;
    url: string;
    name: string;
    uploadedAt: Date;
}

interface ReferenceImageUploaderProps {
    maxImages?: number;
    onImageSelect?: (imageUrl: string) => void;
    isPro?: boolean;
}

export function ReferenceImageUploader({
    maxImages = 5,
    onImageSelect,
    isPro = false
}: ReferenceImageUploaderProps) {
    const [images, setImages] = useState<ReferenceImage[]>([]);
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Check if user has reached max images (unless pro)
        if (!isPro && images.length >= maxImages) {
            alert(`Free tier limited to ${maxImages} reference images. Upgrade to Pro for unlimited storage!`);
            return;
        }

        let file = files[0];
        const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

        // Handle HEIC/HEIF conversion
        if (isHeic) {
            try {
                setIsConverting(true);
                const heic2any = (await import('heic2any')).default;
                
                let conversionPromise: Promise<Blob | Blob[]>;
                try {
                    conversionPromise = heic2any({
                        blob: file,
                        toType: 'image/jpeg',
                        quality: 0.95
                    });
                } catch (syncErr) {
                    console.error('[ReferenceImageUploader] Synchronous error during heic2any call:', syncErr);
                    throw new Error(`Failed to start HEIC conversion: ${syncErr instanceof Error ? syncErr.message : String(syncErr)}`);
                }

                // Wrap conversion promise to capture any errors
                const wrappedConversionPromise = conversionPromise.catch((conversionErr) => {
                    console.error('[ReferenceImageUploader] Conversion promise rejected:', conversionErr);
                    console.error('[ReferenceImageUploader] Conversion error type:', typeof conversionErr);
                    console.error('[ReferenceImageUploader] Conversion error constructor:', conversionErr?.constructor?.name);
                    
                    // Deep inspection of the "empty" object
                    const allProps = conversionErr ? Object.getOwnPropertyNames(conversionErr) : [];
                    console.error('[ReferenceImageUploader] Conversion error all properties:', allProps);
                    
                    let errorMsg = 'HEIC conversion failed';
                    if (conversionErr instanceof Error) {
                        errorMsg = conversionErr.message || 'Unknown conversion error';
                    } else if (typeof conversionErr === 'string') {
                        errorMsg = conversionErr;
                    } else if (conversionErr && typeof conversionErr === 'object') {
                        const errObj = conversionErr as any;
                        errorMsg = errObj.message || errObj.error || errObj.code || errObj.toString?.() || 'Conversion error (details unavailable)';
                    }
                    
                    throw new Error(`HEIC conversion failed: ${errorMsg}`);
                });

                const convertedBlob = await wrappedConversionPromise;

                // heic2any can return an array if multiple images are in the HEIC
                const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

                file = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
                    type: 'image/jpeg',
                });
            } catch (err) {
                console.error('HEIC conversion failed:', err);
                alert('Failed to convert HEIC image. Please try a different format.');
                setIsConverting(false);
                return;
            } finally {
                setIsConverting(false);
            }
        }

        // Validate file type (after potential conversion)
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Image must be smaller than 10MB');
            return;
        }

        // Create object URL for preview
        const reader = new FileReader();
        reader.onload = (event) => {
            const url = event.target?.result as string;
            const newImage: ReferenceImage = {
                id: Date.now().toString(),
                url,
                name: file.name,
                uploadedAt: new Date(),
            };

            setImages(prev => [...prev, newImage]);

            // Auto-select the newly uploaded image
            setSelectedImageId(newImage.id);
            onImageSelect?.(url);
        };
        reader.readAsDataURL(file);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleImageClick = (image: ReferenceImage) => {
        setSelectedImageId(image.id);
        onImageSelect?.(image.url);
    };

    const handleDeleteImage = (imageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setImages(prev => prev.filter(img => img.id !== imageId));

        if (selectedImageId === imageId) {
            setSelectedImageId(null);
            onImageSelect?.(null as unknown as string);
        }
    };

    const canUploadMore = isPro || images.length < maxImages;

    return (
        <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Reference Images</h3>
                {!isPro && (
                    <span className="text-sm text-gray-400">
                        {images.length} / {maxImages}
                    </span>
                )}
            </div>

            {/* Upload button */}
            <label
                className={`w-full py-3 rounded-lg border-2 border-dashed transition-colors mb-4 block text-center cursor-pointer ${canUploadMore && !isConverting
                    ? 'border-gray-600 hover:border-blue-500 text-gray-300 hover:text-blue-400'
                    : 'border-gray-700 text-gray-600 cursor-not-allowed'
                    }`}
            >
                {isConverting ? (
                    <div className="flex flex-col items-center">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                        <span className="text-sm">Converting HEIC...</span>
                    </div>
                ) : (
                    <>
                        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-sm">
                            {canUploadMore ? 'Upload Reference Image' : 'Upgrade to Pro for unlimited images'}
                        </span>
                        {canUploadMore && !isConverting && (
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="absolute w-1 h-1 opacity-0 pointer-events-none"
                            />
                        )}
                    </>
                )}
            </label>


            {/* Image grid */}
            {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                    {images.map(image => (
                        <div
                            key={image.id}
                            onClick={() => handleImageClick(image)}
                            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${selectedImageId === image.id
                                ? 'ring-2 ring-blue-500 scale-95'
                                : 'hover:ring-2 hover:ring-gray-500'
                                }`}
                        >
                            <img
                                src={image.url}
                                alt={image.name}
                                className="w-full h-full object-cover"
                            />

                            {/* Selected indicator */}
                            {selectedImageId === image.id && (
                                <div className="absolute top-2 left-2 bg-blue-500 rounded-full p-1">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}

                            {/* Delete button */}
                            <button
                                onClick={(e) => handleDeleteImage(image.id, e)}
                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 rounded-full p-1 transition-colors"
                            >
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>

                            {/* Image name tooltip */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                                <p className="text-white text-xs truncate">{image.name}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">No reference images yet</p>
                </div>
            )}
        </div>
    );
}
