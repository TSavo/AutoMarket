#!/bin/bash

echo "Video Aspect Ratio Converter (9:16 to 3:4)"
echo "========================================="

if [ "$1" == "--help" ] || [ "$1" == "" ]; then
  echo "Usage:"
  echo "  ./convert-video-aspect.sh <input-path> [output-path] [--overwrite]"
  echo "  ./convert-video-aspect.sh --dir <input-dir> <output-dir> [--overwrite]"
  echo ""
  echo "Options:"
  echo "  --dir        Process all videos in a directory"
  echo "  --overwrite  Overwrite existing output files"
  echo "  --help       Display this help message"
  
  if [ "$1" == "" ]; then
    echo ""
    echo "Error: Missing input path"
    exit 1
  fi
  
  exit 0
fi

echo "Converting video(s) from 9:16 to 3:4 aspect ratio..."
echo ""

node convert-video-aspect.js "$@"

if [ $? -ne 0 ]; then
  echo ""
  echo "Video conversion failed!"
  exit 1
fi

echo ""
echo "Conversion completed!"
