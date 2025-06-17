#!/bin/bash

echo "Horizon City Character Animation"
echo "=============================="
echo

if [ "$#" -eq 0 ]; then
  echo "Usage: ./animate-character.sh [options] [character-slug]"
  echo
  echo "Options:"
  echo "  --generate-prompt   Generate animation prompt only"
  echo "  --animate           Animate the character portrait"
  echo "  --list              List all available characters"
  echo "  --help              Show this help message"
  echo
  echo "Examples:"
  echo "  ./animate-character.sh --list"
  echo "  ./animate-character.sh --generate-prompt akiko"
  echo "  ./animate-character.sh --animate akiko"
  echo "  ./animate-character.sh akiko  (generates prompt and animates)"
  exit 1
fi

npx ts-node src/cli.ts "$@"

if [ $? -ne 0 ]; then
  echo
  echo "Character animation failed!"
  exit 1
fi

echo
echo "Character animation completed successfully!"
