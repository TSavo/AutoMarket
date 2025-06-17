#!/bin/bash

echo "Horizon City Outreach JSON Animation"
echo "============================================="

if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
  echo "Usage:"
  echo "  ./animate-outreach-json.sh <image-filename>"
  echo "  ./animate-outreach-json.sh --all [--force]"
  echo ""
  echo "Options:"
  echo "  --all    Process all images in the JSON file"
  echo "  --force  Force animation even for images that already have animated videos"
  echo "  --help   Display this help message"
  exit 0
fi

if [ -z "$1" ]; then
  echo "Error: Missing image filename or --all option"
  echo "Run './animate-outreach-json.sh --help' for usage information"
  exit 1
fi

echo "Animating outreach image(s)..."
echo ""

cd "$(dirname "$0")"
node animate-outreach-json.js "$@"

if [ $? -ne 0 ]; then
  echo ""
  echo "Process failed!"
  exit 1
fi

echo ""
echo "Process completed!"
exit 0
