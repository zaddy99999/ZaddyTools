#!/bin/bash

# Download missing profile pictures from unavatar.io
# Saves to /public/pfp/ with lowercase filenames

PFP_DIR="/Users/bill/Documents/Development/ZaddyTools/public/pfp"

# Create directory if it doesn't exist
mkdir -p "$PFP_DIR"

# List of handles to download (original case for URL, lowercase for filename)
declare -a handles=(
    "0xCygaar"
    "0xMeow0130"
    "Abstract_Hzn"
    "Bellerophontis2"
    "boredpengubull"
    "BrianHong"
    "CashBowie"
    "coffeedev"
    "curtisjcummings"
    "DonCorletony"
    "dreweth"
    "EJRWEB3"
    "ghayzal_sol"
    "HeyNat"
    "hoangry"
    "itsN1rvy"
    "jochef1995"
    "johnjassper"
    "merheb"
    "monkey2158"
    "nathnnfts"
    "nix_eth"
    "oleeeeeee_"
    "olethomash242"
    "shivst3r"
    "TNFT_Labs"
    "wiredwisely"
)

echo "Downloading ${#handles[@]} profile pictures..."

for handle in "${handles[@]}"; do
    lowercase_handle=$(echo "$handle" | tr '[:upper:]' '[:lower:]')
    filename="${PFP_DIR}/${lowercase_handle}.jpg"

    if [ -f "$filename" ]; then
        echo "SKIP: ${lowercase_handle}.jpg already exists"
        continue
    fi

    echo "Downloading: $handle -> ${lowercase_handle}.jpg"

    # Try unavatar.io first
    url="https://unavatar.io/twitter/${handle}"

    if curl -sL -o "$filename" "$url" && [ -s "$filename" ]; then
        # Check if it's actually an image (not an error page)
        file_type=$(file -b "$filename" | cut -d' ' -f1)
        if [[ "$file_type" == "JPEG" || "$file_type" == "PNG" || "$file_type" == "GIF" ]]; then
            echo "  SUCCESS: Downloaded ${lowercase_handle}.jpg"
        else
            echo "  FAILED: $handle returned non-image content"
            rm -f "$filename"
        fi
    else
        echo "  FAILED: Could not download $handle"
        rm -f "$filename"
    fi

    # Small delay to avoid rate limiting
    sleep 0.3
done

echo ""
echo "Done! Checking results..."
ls -la "$PFP_DIR" | wc -l
echo "total files in pfp directory"
