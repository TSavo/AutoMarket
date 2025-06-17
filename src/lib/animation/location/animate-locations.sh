#!/bin/bash

echo "Horizon City Location Animation"
echo "============================================="

if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
  echo "Usage:"
  echo "  ./animate-locations.sh <location-slug>"
  echo "  ./animate-locations.sh --all [--force]"
  echo ""
  echo "Options:"
  echo "  --all    Process all locations that need animation"
  echo "  --force  Force animation even for locations that already have animated videos"
  echo "  --help   Display this help message"
  exit 0
fi

if [ -z "$1" ]; then
  echo "Error: Missing location slug or --all option"
  echo "Run './animate-locations.sh --help' for usage information"
  exit 1
fi

echo "Animating location(s)..."
echo ""

node animate-locations.js "$@"

if [ $? -ne 0 ]; then
  echo ""
  echo "Process failed!"
  exit 1
fi

echo ""
echo "Process completed!"
