import { NextPage } from 'next';
import {
  Box,
  Heading,
  Text,
  Textarea,
  Button,
  Image,
  Badge
} from '@chakra-ui/react';
import { useState } from 'react';

interface MediaCreationResult {
  type: 'image' | 'animation' | 'audio' | 'transcript';
  url?: string;
  error?: string;
  duration?: number;
  fileSize?: number;
  text?: string;
  confidence?: number;
  language?: string;
}

const MediaCreationTest: NextPage = () => {
  const [imagePrompt, setImagePrompt] = useState('');
  const [animationPrompt, setAnimationPrompt] = useState('');
  const [audioText, setAudioText] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [results, setResults] = useState<MediaCreationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const showMessage = (message: string, type: 'success' | 'error' = 'success') => {
    console.log(`${type.toUpperCase()}: ${message}`);
    // You can replace this with a proper toast notification
  };

  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      showMessage('Please enter an image prompt', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/media/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          options: {
            width: 1024,
            height: 1024,
            aspectRatio: '1:1'
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setResults(prev => [...prev, {
          type: 'image',
          url: result.url
        }]);
        showMessage('Image generated successfully!');
      } else {
        throw new Error(result.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      setResults(prev => [...prev, {
        type: 'image',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]);
      showMessage('Failed to generate image', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const animateImage = async () => {
    const lastImageResult = results.filter(r => r.type === 'image' && r.url).pop();
    
    if (!lastImageResult?.url) {
      showMessage('Please generate an image first', 'error');
      return;
    }

    if (!animationPrompt.trim()) {
      showMessage('Please enter an animation prompt', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/media/animate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: lastImageResult.url,
          prompt: animationPrompt,
          options: {
            fps: 30,
            numFrames: 60
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setResults(prev => [...prev, {
          type: 'animation',
          url: result.url
        }]);
        showMessage('Animation created successfully!');
      } else {
        throw new Error(result.error || 'Failed to animate image');
      }
    } catch (error) {
      console.error('Error animating image:', error);
      setResults(prev => [...prev, {
        type: 'animation',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]);
      showMessage('Failed to animate image', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  const transcribeAudio = async () => {
    if (!audioFile) {
      showMessage('Please select an audio file first', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);

      const response = await fetch('/api/media/transcribe-audio', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setResults(prev => [...prev, {
          type: 'transcript',
          text: result.text,
          confidence: result.confidence,
          language: result.language,
          duration: result.processingTime / 1000
        }]);
        showMessage('Audio transcribed successfully!');
      } else {
        throw new Error(result.error || 'Failed to transcribe audio');
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setResults(prev => [...prev, {
        type: 'transcript',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]);
      showMessage('Failed to transcribe audio', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  const generateAudio = async () => {
    if (!audioText.trim()) {
      showMessage('Please enter text for audio generation', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/media/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: audioText,
          options: {
            voice: 'default',
            speed: 1.0,
            provider: 'auto'
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setResults(prev => [...prev, {
          type: 'audio',
          url: result.url,
          duration: result.duration,
          fileSize: result.fileSize
        }]);
        showMessage('Audio generated successfully!');
      } else {
        throw new Error(result.error || 'Failed to generate audio');
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      setResults(prev => [...prev, {
        type: 'audio',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]);
      showMessage('Failed to generate audio', 'error');
    } finally {
      setIsLoading(false);
    }
  };
          type: 'audio',
          url: result.url,
          duration: result.duration,
          fileSize: result.fileSize
        }]);
        showMessage('Audio generated successfully!');
      } else {
        throw new Error(result.error || 'Failed to generate audio');
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      setResults(prev => [...prev, {
        type: 'audio',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]);
      showMessage('Failed to generate audio', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={8} maxW="1200px" mx="auto">
      <Box mb={8}>
        <Heading as="h1" size="xl" textAlign="center" mb={4}>
          AutoMarket Media Creation Test
        </Heading>
        
        {isLoading && (
          <Box textAlign="center" mb={4}>
            <Text>Processing... Please wait</Text>
          </Box>
        )}
      </Box>

      {/* Image Generation */}
      <Box mb={8} p={6} borderWidth={1} borderRadius="md">
        <Heading as="h2" size="lg" mb={4}>
          Image Generation <Badge colorScheme="blue">Replicate</Badge>
        </Heading>
        <Box mb={4}>
          <Text mb={2}>Image Prompt:</Text>
          <Textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="Enter a detailed description for image generation..."
            rows={3}
            mb={4}
          />
        </Box>
        <Button
          onClick={generateImage}
          loading={isLoading}
          colorScheme="blue"
          size="lg"
          disabled={isLoading}
        >
          Generate Image
        </Button>
      </Box>

      {/* Image Animation */}
      <Box mb={8} p={6} borderWidth={1} borderRadius="md">
        <Heading as="h2" size="lg" mb={4}>
          Image Animation <Badge colorScheme="green">FAL.ai</Badge>
        </Heading>
        <Box mb={4}>
          <Text mb={2}>Animation Prompt:</Text>
          <Textarea
            value={animationPrompt}
            onChange={(e) => setAnimationPrompt(e.target.value)}
            placeholder="Describe how you want the last generated image to move..."
            rows={3}
            mb={4}
          />
        </Box>
        <Button
          onClick={animateImage}
          loading={isLoading}
          colorScheme="green"
          size="lg"
          disabled={isLoading || !results.some(r => r.type === 'image' && r.url)}
        >
          Animate Last Image
        </Button>
      </Box>

      {/* Audio Generation */}
      <Box mb={8} p={6} borderWidth={1} borderRadius="md">
        <Heading as="h2" size="lg" mb={4}>
          Text-to-Speech <Badge colorScheme="purple">Chatterbox</Badge>
        </Heading>
        <Box mb={4}>
          <Text mb={2}>Text to Convert:</Text>
          <Textarea
            value={audioText}
            onChange={(e) => setAudioText(e.target.value)}
            placeholder="Enter text to convert to speech..."
            rows={4}
            mb={4}
          />
        </Box>
        <Button
          onClick={generateAudio}
          loading={isLoading}
          colorScheme="purple"
          size="lg"
          disabled={isLoading}
        >
          Generate Audio
        </Button>
      </Box>

      {/* Results */}
      {results.length > 0 && (
        <Box p={6} borderWidth={1} borderRadius="md">
          <Heading as="h2" size="lg" mb={4}>
            Generated Media
          </Heading>
          {results.map((result, index) => (
            <Box key={index} p={4} borderWidth={1} borderRadius="md" mb={4}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Badge
                  colorScheme={
                    result.type === 'image'
                      ? 'blue'
                      : result.type === 'animation'
                      ? 'green'
                      : 'purple'
                  }
                >
                  {result.type.toUpperCase()}
                </Badge>
                <Text fontSize="sm" color="gray.500">
                  #{index + 1}
                </Text>
              </Box>
              
              {result.error ? (
                <Text color="red.500">Error: {result.error}</Text>
              ) : result.url ? (
                <Box>
                  {result.type === 'image' && (
                    <Image src={result.url} alt="Generated" maxH="200px" objectFit="contain" mb={2} />
                  )}
                  {result.type === 'animation' && (
                    <Box mb={2}>
                      <video controls style={{ maxHeight: '200px', width: '100%' }}>
                        <source src={result.url} type="video/mp4" />
                      </video>
                    </Box>
                  )}
                  {result.type === 'audio' && (
                    <Box mb={2}>
                      <audio controls style={{ width: '100%' }}>
                        <source src={result.url} type="audio/mp3" />
                      </audio>
                    </Box>
                  )}                  <Text fontSize="sm" color="blue.500">
                    <a href={result.url} target="_blank" rel="noopener noreferrer">
                      {result.url}
                    </a>
                  </Text>
                  {result.duration && (
                    <Text fontSize="sm">Duration: {result.duration}s</Text>
                  )}
                  {result.fileSize && (
                    <Text fontSize="sm">File Size: {(result.fileSize / 1024 / 1024).toFixed(2)} MB</Text>
                  )}
                </Box>
              ) : (
                <Text color="gray.500">Generating...</Text>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default MediaCreationTest;
