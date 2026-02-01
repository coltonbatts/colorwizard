'use client'

/**
 * UploadHero - Full-screen hero upload component for empty state
 * Provides a compelling, obvious upload experience when no image is loaded
 */

import { useCallback, useState, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface UploadHeroProps {
    onImageLoad: (img: HTMLImageElement) => void
}

export default function UploadHero({ onImageLoad }: UploadHeroProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const fileInputId = useId()
    const cameraInputId = useId()

    const handleFile = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            return
        }

        setIsLoading(true)
        const objectUrl = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            onImageLoad(img)
            setIsLoading(false)
            URL.revokeObjectURL(objectUrl)
        }
        img.onerror = () => {
            setIsLoading(false)
            URL.revokeObjectURL(objectUrl)
        }
        img.src = objectUrl
    }, [onImageLoad])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const files = e.dataTransfer.files
        if (files.length > 0) {
            handleFile(files[0])
        }
    }, [handleFile])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget
        const files = input.files
        if (files && files.length > 0) {
            handleFile(files[0])
        }
        input.value = ''
    }, [handleFile])

    return (
        <motion.div
            className="upload-hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
        >
            {/* Hidden file inputs */}
            <input
                id={fileInputId}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="sr-only"
            />
            <input
                id={cameraInputId}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="sr-only"
            />

            {/* Main Drop Zone */}
            <div
                className={`upload-hero-zone ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="upload-hero-content"
                        >
                            <div className="upload-hero-spinner" />
                            <p className="upload-hero-text">Loading image...</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="upload-hero-content"
                        >
                            {/* Upload Icon */}
                            <motion.div
                                className="upload-hero-icon"
                                animate={isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                            >
                                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" x2="12" y1="3" y2="15" />
                                </svg>
                            </motion.div>

                            {/* Text */}
                            <h1 className="upload-hero-title">
                                {isDragging ? 'Drop your image' : 'Upload an image to sample colors'}
                            </h1>
                            <p className="upload-hero-subtitle">
                                Drag and drop, or click to browse
                            </p>

                            {/* Action Buttons */}
                            <div className="upload-hero-actions">
                                <label
                                    htmlFor={fileInputId}
                                    className="upload-hero-btn primary"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" x2="12" y1="3" y2="15" />
                                    </svg>
                                    <span>Choose File</span>
                                </label>

                                {/* Camera button - primarily for mobile */}
                                <label
                                    htmlFor={cameraInputId}
                                    className="upload-hero-btn secondary"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                                        <circle cx="12" cy="13" r="3" />
                                    </svg>
                                    <span>Take Photo</span>
                                </label>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Subtle branding */}
            <div className="upload-hero-brand">
                <span className="font-wordmark text-2xl text-studio-muted">Color Wizard</span>
            </div>
        </motion.div>
    )
}
