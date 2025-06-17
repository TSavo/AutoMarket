#!/bin/bash

echo "Horizon City Technology Animation"
echo "============================================="

if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
  echo "Usage:"
  echo "  ./animate-technologies.sh <technology-slug>"
  echo "  ./animate-technologies.sh --all [--force]"
  echo ""
  echo "Options:"
  echo "  --all    Process all technologies that need animation"
  echo "  --force  Force animation even for technologies that already have animated videos"
  echo "  --help   Display this help message"
  exit 0
fi

if [ -z "$1" ]; then
  echo "Error: Missing technology slug or --all option"
  echo "Run './animate-technologies.sh --help' for usage information"
  exit 1
fi

echo "Animating technology(s)..."
echo ""

node animate-technologies.js "$@"

if [ $? -ne 0 ]; then
  echo ""
  echo "Process failed!"
  exit 1
fi

echo ""
echo "Process completed!"
