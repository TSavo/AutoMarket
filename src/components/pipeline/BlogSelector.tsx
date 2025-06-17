/**
 * Blog Selector Component
 *
 * First step in the pipeline - allows selecting a blog post to convert to video.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  SimpleGrid,
  Spinner,
  Input,
  VStack
} from '@chakra-ui/react';
import { BlogPost } from '../../pipeline/types';
import { BlogMarkdown } from '../../lib/markdown/BlogMarkdown';

interface BlogSelectorProps {
  selectedBlog: BlogPost | undefined;
  onBlogSelected: (blog: BlogPost) => void;
  onGenerateScript: () => void;
  loading: boolean;
}

export default function BlogSelector({
  selectedBlog,
  onBlogSelected,
  onGenerateScript,
  loading
}: BlogSelectorProps) {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingBlogs, setLoadingBlogs] = useState(true);

  // Load real blog posts from API
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        // Fetch blog data from API
        const response = await fetch('/api/blog/list?includeDrafts=false&includeFuture=false');

        if (!response.ok) {
          throw new Error('Failed to fetch blog posts');
        }

        const data = await response.json();

        if (data.success) {
          setBlogs(data.posts);
        } else {
          throw new Error(data.error || 'Failed to fetch blog posts');
        }

        setLoadingBlogs(false);
      } catch (error) {
        console.error('Error fetching blogs:', error);
        setLoadingBlogs(false);
      }
    };

    fetchBlogs();
  }, []);

  // Filter blogs by search term
  const filteredBlogs = blogs.filter(blog =>
    blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blog.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blog.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle blog selection
  const handleSelectBlog = (blog: BlogPost) => {
    onBlogSelected(blog);
  };

  return (
    <Box>
      <VStack gap={6} align="stretch">
        <Heading size="md">Select a Blog Post</Heading>

        {/* Search input */}
        <Input
          placeholder="Search blog posts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Loading indicator */}
        {loadingBlogs && (
          <Box textAlign="center" py={10}>
            <Spinner size="xl" color="purple.500" />
            <Text mt={4}>Loading blog posts...</Text>
          </Box>
        )}

        {/* Blog grid */}
        {!loadingBlogs && (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
            {filteredBlogs.map(blog => (
              <Box
                key={blog.slug}
                p={4}
                borderWidth={selectedBlog?.slug === blog.slug ? 2 : 1}
                borderColor={selectedBlog?.slug === blog.slug ? 'purple.500' : 'gray.200'}
                borderRadius="md"
                cursor="pointer"
                onClick={() => handleSelectBlog(blog)}
                transition="all 0.2s"
                _hover={{ transform: 'translateY(-4px)', shadow: 'md' }}
              >
                <VStack align="start" gap={2}>
                  <Heading size="sm">{blog.title}</Heading>
                  <Text fontSize="sm" color="gray.600" lineClamp={2}>
                    {blog.description}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    By {blog.author} • {new Date(blog.date).toLocaleDateString()}
                  </Text>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        )}

        {/* No results */}
        {!loadingBlogs && filteredBlogs.length === 0 && (
          <Box textAlign="center" py={10}>
            <Text>No blog posts found matching your search.</Text>
          </Box>
        )}

        {/* Continue button */}
        {selectedBlog && (
          <Box textAlign="center">
            <Button
              colorPalette="purple"
              size="lg"
              onClick={onGenerateScript}
              disabled={loading}
              loading={loading}
            >
              Generate Script
            </Button>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
