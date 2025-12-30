
import sys

def main():
    # Read 32x32 BMP (32bpp from sips usually, or 24bpp)
    try:
        with open('/tmp/cursor.bmp', 'rb') as f:
            data = f.read()
    except FileNotFoundError:
        print("Error: BMP not found")
        return

    # Parse BMP Header
    pixel_offset = int.from_bytes(data[10:14], 'little')
    width = int.from_bytes(data[18:22], 'little')
    height = int.from_bytes(data[22:26], 'little')
    bpp = int.from_bytes(data[28:30], 'little')

    if bpp not in [24, 32]:
        print("Unsupported BPP")
        return

    row_size = ((width * bpp + 31) // 32) * 4
    
    # Extract pixels
    black_pixels = []
    white_pixels = []
    
    for y in range(height):
        y_flip = height - 1 - y
        row_start = pixel_offset + y * row_size
        
        # Buffer check
        if row_start + width * (bpp // 8) > len(data):
            break
            
        for x in range(width):
            if bpp == 24:
                b = data[row_start + x*3]
                g = data[row_start + x*3 + 1]
                r = data[row_start + x*3 + 2]
                a = 255
            elif bpp == 32:
                b = data[row_start + x*4]
                g = data[row_start + x*4 + 1]
                r = data[row_start + x*4 + 2]
                a = data[row_start + x*4 + 3]
            
            # Simple threshold
            # Check transparency? Sips BMP might not handle alpha from JPG correctly (JPG has no alpha).
            # But we want to REMOVE background (checkerboard).
            
            brightness = (r + g + b) // 3
            
            # Black (Outline)
            if brightness < 50:
                black_pixels.append((x, y_flip))
            # White (Fill)
            elif brightness > 230:
                white_pixels.append((x, y_flip))
    
    # Generate Optimized Path
    # Instead of <rect>, use one <path d="..."> for black, one for white.
    # Naive path: "M x y h 1 v 1 h -1 z" for each pixel.
    # It's verbose but much faster for browser than 1000 <use> elements.
    
    def pixels_to_path(pixels):
        path = ""
        for x, y in pixels:
            path += f"M{x},{y}h1v1h-1z"
        return path

    black_path = pixels_to_path(black_pixels)
    white_path = pixels_to_path(white_pixels)
    
    # Create SVG
    # 0 0 co-ords are implicit.
    svg = f'<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
    svg += f'<path fill="black" d="{black_path}" />'
    svg += f'<path fill="white" d="{white_path}" />'
    svg += '</svg>'
    
    print(svg)

if __name__ == "__main__":
    main()
