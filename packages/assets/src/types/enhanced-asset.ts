/**
 * Enhanced Asset Types for Provider Integration
 * 
 * Extends the existing asset system to work with the new provider architecture
 */

import { MediaCapability } from '@automarket/core';

// Re-export existing types for compatibility
export * from '../../../../src/media/types';

/**
 * Enhanced asset interface that includes provider integration
 */
export interface EnhancedAsset {
  id: string;
  path: string;
  filename: string;
  type: string;
  title: string;
  description?: string;
  tags: string[];
  contentPurpose: string[];
  dateCreated: string;
  dateModified: string;
  author?: string;
  license?: string;
  fileSize: number;
  
  // Provider integration fields
  generatedBy?: {
    providerId: string;
    modelId: string;
    capability: MediaCapability;
    parameters: Record<string, any>;
    jobId?: string;
    cost?: {
      amount: number;
      currency: string;
    };
    generatedAt: string;
  };
  
  // Content association (replaces blog-specific linking)
  associatedContent?: {
    type: 'text' | 'script' | 'document' | 'workflow';
    id: string;
    title?: string;
    excerpt?: string;
  };
  
  // Processing history
  processingHistory?: Array<{
    step: string;
    providerId?: string;
    capability?: MediaCapability;
    timestamp: string;
    status: 'success' | 'failed' | 'skipped';
    metadata?: Record<string, any>;
  }>;
  
  // Transcription data (for video/audio assets)
  transcription?: {
    text: string;
    confidence: number;
    language: string;
    providerId: string;
    modelId: string;
    wordTimestamps?: Array<{
      word: string;
      start: number;
      end: number;
      confidence?: number;
    }>;
    generatedAt: string;
  };
  
  // Derivatives and variations
  derivatives?: Array<{
    id: string;
    type: 'thumbnail' | 'preview' | 'optimized' | 'transcoded' | 'enhanced';
    path: string;
    providerId?: string;
    parameters?: Record<string, any>;
  }>;
}

/**
 * Content request for generating media assets
 */
export interface ContentRequest {
  id: string;
  type: 'text' | 'script' | 'document';
  content: string;
  title?: string;
  metadata?: Record<string, any>;
  
  // Generation preferences
  preferences?: {
    preferLocal?: boolean;
    maxCost?: number;
    quality?: 'draft' | 'standard' | 'premium';
    excludeProviders?: string[];
  };
  
  // Required capabilities for this content
  requiredCapabilities?: MediaCapability[];
}

/**
 * Asset generation request
 */
export interface AssetGenerationRequest {
  contentRequest: ContentRequest;
  capability: MediaCapability;
  parameters: Record<string, any>;
  outputPath?: string;
  tags?: string[];
  contentPurpose?: string[];
}

/**
 * Asset generation result
 */
export interface AssetGenerationResult {
  success: boolean;
  asset?: EnhancedAsset;
  error?: string;
  providerId?: string;
  modelId?: string;
  cost?: {
    amount: number;
    currency: string;
  };
  processingTime?: number;
}

/**
 * Media ingestion options with provider integration
 */
export interface EnhancedIngestOptions {
  // Existing options
  path: string;
  generateId?: boolean;
  extractTags?: boolean;
  defaultTitle?: string;
  defaultDescription?: string;
  
  // Provider integration options
  enableTranscription?: boolean;
  transcriptionProvider?: string;
  enableEnhancement?: boolean;
  enhancementProvider?: string;
  generateDerivatives?: boolean;
  
  // Content association
  associatedContent?: {
    type: 'text' | 'script' | 'document' | 'workflow';
    id: string;
    title?: string;
  };
  
  // Processing preferences
  preferences?: {
    preferLocal?: boolean;
    maxCost?: number;
    quality?: 'draft' | 'standard' | 'premium';
  };
}

/**
 * Enhanced media ingestion result
 */
export interface EnhancedIngestResult {
  success: boolean;
  asset?: EnhancedAsset;
  error?: string;
  processingSteps?: Array<{
    step: string;
    providerId?: string;
    capability?: MediaCapability;
    status: 'success' | 'failed' | 'skipped';
    result?: any;
    error?: string;
  }>;
  totalCost?: {
    amount: number;
    currency: string;
  };
  processingTime?: number;
}

/**
 * Asset search and filtering options
 */
export interface EnhancedAssetFilter {
  // Existing filters
  tags?: string[];
  contentPurpose?: string[];
  type?: string | string[];
  dateCreatedAfter?: string;
  dateCreatedBefore?: string;
  
  // Provider-specific filters
  generatedBy?: string | string[]; // Provider IDs
  capability?: MediaCapability | MediaCapability[];
  hasTranscription?: boolean;
  associatedContentType?: 'text' | 'script' | 'document' | 'workflow';
  associatedContentId?: string;
  
  // Cost and quality filters
  maxGenerationCost?: number;
  minConfidence?: number; // For transcriptions
  
  // Processing status filters
  processingStatus?: 'success' | 'failed' | 'pending';
  lastProcessedAfter?: string;
  lastProcessedBefore?: string;
}

/**
 * Asset statistics and analytics
 */
export interface AssetAnalytics {
  totalAssets: number;
  assetsByType: Record<string, number>;
  assetsByProvider: Record<string, number>;
  assetsByCapability: Record<MediaCapability, number>;
  totalGenerationCost: {
    amount: number;
    currency: string;
  };
  averageProcessingTime: number;
  successRate: number;
  
  // Content association stats
  associatedContentStats: {
    totalAssociated: number;
    byContentType: Record<string, number>;
  };
  
  // Transcription stats
  transcriptionStats: {
    totalTranscribed: number;
    averageConfidence: number;
    byLanguage: Record<string, number>;
  };
}
