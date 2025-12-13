
import sys
import math
from PIL import Image

def generate_disc(color_hex, output_path):
    # Parse color
    if color_hex.startswith('#'):
        color_hex = color_hex[1:]
    r_label = int(color_hex[0:2], 16)
    g_label = int(color_hex[2:4], 16)
    b_label = int(color_hex[4:6], 16)

    width = 16
    height = 16
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    pixels = img.load()

    center_x = 7.5
    center_y = 7.5

    # Palette
    # Dark gray for the vinyl
    c_vinyl_dark = (20, 20, 20, 255)
    c_vinyl_base = (36, 36, 36, 255) 
    c_vinyl_light = (45, 45, 45, 255) # Highlights
    
    # Label colors
    c_label_base = (r_label, g_label, b_label, 255)
    c_label_dark = (int(r_label*0.7), int(g_label*0.7), int(b_label*0.7), 255)
    c_label_bright = (min(255, int(r_label*1.2)), min(255, int(g_label*1.2)), min(255, int(b_label*1.2)), 255)

    # Center hole (darker label color usually)
    c_center = (int(r_label*0.3), int(g_label*0.3), int(b_label*0.3), 255)

    # 16x16 Circle Mask (1 = draw, 0 = skip)
    # Manually tweaking for "Minecraft Round" look
    # y\x 0123456789012345
    # 0   .....XXXXXX.....
    # 1   ...XXXXXXXXXX...
    # 2   ..XXXXXXXXXXXX..
    # 3   .XXXXXXXXXXXXXX.
    # 4   .XXXXXXXXXXXXXX.
    # 5   XXXXXXXXXXXXXXXX
    # 6   XXXXXXXXXXXXXXXX
    # 7   XXXXXXXXXXXXXXXX
    # ...
    
    for y in range(height):
        for x in range(width):
            dx = x - center_x
            dy = y - center_y
            dist = math.sqrt(dx*dx + dy*dy)
            
            # Shape mask
            draw = True
            # Cut corners to make it round
            # Corner 1 (0,0) area
            if (x+y) < 3: draw = False
            if x==0 and y==3: draw = False
            if x==3 and y==0: draw = False
            # Corner 2 (15,0) area
            if (15-x + y) < 3: draw = False
            if x==15 and y==3: draw = False
            if x==12 and y==0: draw = False
            # Corner 3 (0,15) area
            if (x + 15-y) < 3: draw = False
            if x==0 and y==12: draw = False
            if x==3 and y==15: draw = False
            # Corner 4 (15,15) area
            if (15-x + 15-y) < 3: draw = False
            if x==15 and y==12: draw = False
            if x==12 and y==15: draw = False

            # Further smoothing for 16x16 circle
            # Row 0/15: start at x=5, end at x=10
            if y==0 or y==15:
                if x < 5 or x > 10: draw = False
            # Row 1/14: start at x=3, end at x=12
            if y==1 or y==14:
                if x < 3 or x > 12: draw = False
            # Row 2/13: start at x=2, end at x=13
            if y==2 or y==13:
                if x < 2 or x > 13: draw = False
            # Row 3/12: start at x=1, end at x=14
            if y==3 or y==12:
                if x < 1 or x > 14: draw = False
                
            if not draw:
                continue

            # Default to vinyl base
            color = c_vinyl_base
            
            # Rings / Texture
            # Outer ring darker
            if dist > 6.5:
                color = c_vinyl_dark
            # Inner highlight ring
            elif 4.0 < dist < 5.5:
                # Dithering / Pattern for highlight
                if (x + y) % 2 == 0:
                    color = c_vinyl_light
                else:
                    color = c_vinyl_base
            
            # Label (Radius ~2.5)
            if dist <= 2.8:
                color = c_label_base
                # Label detail
                if dist > 1.8:
                     if (x+y) % 2 == 1:
                         color = c_label_dark
            
            # Center "hole" or core (Radius ~1)
            if dist <= 1.2:
                color = c_center
                # The very center 4 pixels
                if 7 <= x <= 8 and 7 <= y <= 8:
                    # Specific center detail from reference image often has a solid color
                    color = c_label_bright

            pixels[x, y] = color

    img.save(output_path)
    print(f"Generated {output_path}")

if __name__ == "__main__":
    # Default purple color from the user image analysis
    # [154 117 255] -> #9A75FF
    color = "9A75FF" 
    out = "temps/disc_purple.png"
    
    if len(sys.argv) > 1:
        color = sys.argv[1]
    if len(sys.argv) > 2:
        out = sys.argv[2]
    
    generate_disc(color, out)
