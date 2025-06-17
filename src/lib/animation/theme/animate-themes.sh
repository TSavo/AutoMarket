#!/bin/bash

echo "Horizon City Theme Animation"
echo "============================================="

if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
  echo "Usage:"
  echo "  ./animate-themes.sh <theme-slug>"
  echo "  ./animate-themes.sh --all [--force]"
  echo ""
  echo "Options:"
  echo "  --all    Process all themes that need animation"
  echo "  --force  Force animation even for themes that already have animated videos"
  echo "  --help   Display this help message"
  exit 0
fi

if [ -z "$1" ]; then
  echo "Error: Missing theme slug or --all option"
  echo "Run './animate-themes.sh --help' for usage information"
  exit 1
fi

echo "Animating theme(s)..."
echo ""

node animate-themes.js "$@"

if [ $? -ne 0 ]; then
  echo ""
  echo "Process failed!"
  exit 1
fi

echo ""
echo "Process completed!"
