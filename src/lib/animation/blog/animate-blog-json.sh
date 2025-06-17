#!/bin/bash

echo "Horizon City Blog Hover Images Animation"
echo "============================================="

if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
  echo "Usage:"
  echo "  ./animate-blog-json.sh <image-filename>"
  echo "  ./animate-blog-json.sh --all [--force]"
  echo ""
  echo "Options:"
  echo "  --all    Process all hover images in the JSON file"
  echo "  --force  Force animation even for images that already have animated videos"
  echo "  --help   Display this help message"
  exit 0
fi

if [ -z "$1" ]; then
  echo "Error: Missing image filename or --all option"
  echo "Run './animate-blog-json.sh --help' for usage information"
  exit 1
fi

echo "Animating blog hover image(s)..."
echo ""

cd "$(dirname "$0")"
node animate-blog-json.js "$@"

if [ $? -ne 0 ]; then
  echo ""
  echo "Process failed!"
  exit 1
fi

echo ""
echo "Process completed!"
exit 0
