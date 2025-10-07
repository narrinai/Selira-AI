#!/usr/bin/env python3
"""
Generate Selira AI social media assets with purple branding
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Colors
BG_DARK = '#0a0a0a'
PURPLE = '#ce93d8'
PINK = '#ec4899'
WHITE = '#ffffff'

# Fonts
def get_font(size, bold=False):
    """Get font with fallbacks"""
    font_names = [
        '/System/Library/Fonts/Supplemental/Georgia.ttf',
        '/System/Library/Fonts/Georgia.ttc',
        '/Library/Fonts/Georgia.ttf'
    ]

    for font_path in font_names:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except:
                continue

    return ImageFont.load_default()

def create_gradient(width, height, color1, color2, direction='horizontal'):
    """Create a gradient image"""
    base = Image.new('RGB', (width, height), color1)
    top = Image.new('RGB', (width, height), color2)
    mask = Image.new('L', (width, height))
    mask_data = []

    if direction == 'horizontal':
        for y in range(height):
            for x in range(width):
                mask_data.append(int(255 * (x / width)))
    else:  # vertical or diagonal
        for y in range(height):
            for x in range(width):
                # Diagonal gradient
                mask_data.append(int(255 * ((x + y) / (width + height))))

    mask.putdata(mask_data)
    base.paste(top, (0, 0), mask)
    return base

# 1. Logo Templates
def generate_logo_main(width=1200, height=400):
    """Main logo with tagline"""
    img = Image.new('RGB', (width, height), BG_DARK)
    draw = ImageDraw.Draw(img)

    # Logo text
    font_logo = get_font(120, bold=True)
    font_tagline = get_font(36)

    logo_text = "Selira AI"
    tagline = "Always Unlimited Free Chat"

    # Calculate positions
    bbox_logo = draw.textbbox((0, 0), logo_text, font=font_logo)
    logo_width = bbox_logo[2] - bbox_logo[0]
    logo_height = bbox_logo[3] - bbox_logo[1]

    bbox_tagline = draw.textbbox((0, 0), tagline, font=font_tagline)
    tagline_width = bbox_tagline[2] - bbox_tagline[0]

    # Draw logo
    logo_x = (width - logo_width) // 2
    logo_y = height // 2 - 80
    draw.text((logo_x, logo_y), logo_text, fill=PURPLE, font=font_logo)

    # Draw tagline
    tagline_x = (width - tagline_width) // 2
    tagline_y = logo_y + logo_height + 30
    draw.text((tagline_x, tagline_y), tagline, fill=WHITE, font=font_tagline)

    img.save('social-assets/logo-main-purple.png')
    print('✅ Created logo-main-purple.png')

def generate_logo_square(size=800):
    """Square logo"""
    img = Image.new('RGB', (size, size), BG_DARK)
    draw = ImageDraw.Draw(img)

    font = get_font(150, bold=True)
    text = "Selira AI"

    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    x = (size - text_width) // 2
    y = (size - text_height) // 2

    draw.text((x, y), text, fill=PURPLE, font=font)

    img.save('social-assets/logo-square-purple.png')
    print('✅ Created logo-square-purple.png')

# 2. Profile Pictures
def generate_profile_circle(size=400):
    """Circular profile picture"""
    # Create square first
    img = Image.new('RGB', (size, size), BG_DARK)
    draw = ImageDraw.Draw(img)

    # Draw large 'S' in center
    font = get_font(220, bold=True)
    text = "S"

    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    x = (size - text_width) // 2
    y = (size - text_height) // 2 - 10

    draw.text((x, y), text, fill=PURPLE, font=font)

    # Create circular mask
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse((0, 0, size, size), fill=255)

    # Apply mask
    output = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    output.paste(img, (0, 0))
    output.putalpha(mask)

    output.save('social-assets/profile-circle-purple.png')
    print('✅ Created profile-circle-purple.png')

def generate_profile_square(size=1080):
    """Square profile picture"""
    img = Image.new('RGB', (size, size), BG_DARK)
    draw = ImageDraw.Draw(img)

    # Draw large 'S' in center
    font = get_font(480, bold=True)
    text = "S"

    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    x = (size - text_width) // 2
    y = (size - text_height) // 2 - 20

    draw.text((x, y), text, fill=PURPLE, font=font)

    img.save('social-assets/profile-square-purple.png')
    print('✅ Created profile-square-purple.png')

# 3. Social Media Banners
def generate_twitter_banner(width=1500, height=500):
    """Twitter/X header"""
    img = Image.new('RGB', (width, height), BG_DARK)
    draw = ImageDraw.Draw(img)

    font_logo = get_font(100, bold=True)
    font_tagline = get_font(32)

    logo_text = "Selira AI"
    tagline = "Always Unlimited Free Chat"

    # Logo
    bbox_logo = draw.textbbox((0, 0), logo_text, font=font_logo)
    logo_width = bbox_logo[2] - bbox_logo[0]
    logo_height = bbox_logo[3] - bbox_logo[1]

    logo_x = (width - logo_width) // 2
    logo_y = height // 2 - 60
    draw.text((logo_x, logo_y), logo_text, fill=PURPLE, font=font_logo)

    # Tagline
    bbox_tagline = draw.textbbox((0, 0), tagline, font=font_tagline)
    tagline_width = bbox_tagline[2] - bbox_tagline[0]
    tagline_x = (width - tagline_width) // 2
    tagline_y = logo_y + logo_height + 20
    draw.text((tagline_x, tagline_y), tagline, fill=WHITE, font=font_tagline)

    img.save('social-assets/twitter-banner-purple.png')
    print('✅ Created twitter-banner-purple.png')

def generate_facebook_cover(width=1200, height=630):
    """Facebook cover"""
    img = Image.new('RGB', (width, height), BG_DARK)
    draw = ImageDraw.Draw(img)

    font_logo = get_font(90, bold=True)
    font_tagline = get_font(28)

    logo_text = "Selira AI"
    tagline = "Always Unlimited Free Chat"

    # Logo
    bbox_logo = draw.textbbox((0, 0), logo_text, font=font_logo)
    logo_width = bbox_logo[2] - bbox_logo[0]
    logo_height = bbox_logo[3] - bbox_logo[1]

    logo_x = (width - logo_width) // 2
    logo_y = height // 2 - 50
    draw.text((logo_x, logo_y), logo_text, fill=PURPLE, font=font_logo)

    # Tagline
    bbox_tagline = draw.textbbox((0, 0), tagline, font=font_tagline)
    tagline_width = bbox_tagline[2] - bbox_tagline[0]
    tagline_x = (width - tagline_width) // 2
    tagline_y = logo_y + logo_height + 20
    draw.text((tagline_x, tagline_y), tagline, fill=WHITE, font=font_tagline)

    img.save('social-assets/facebook-cover-purple.png')
    print('✅ Created facebook-cover-purple.png')

def generate_instagram_post(size=1080):
    """Instagram post"""
    img = Image.new('RGB', (size, size), BG_DARK)
    draw = ImageDraw.Draw(img)

    font_logo = get_font(140, bold=True)
    font_tagline = get_font(36)

    logo_text = "Selira AI"
    tagline = "Always Unlimited\nFree Chat"

    # Logo
    bbox_logo = draw.textbbox((0, 0), logo_text, font=font_logo)
    logo_width = bbox_logo[2] - bbox_logo[0]
    logo_height = bbox_logo[3] - bbox_logo[1]

    logo_x = (size - logo_width) // 2
    logo_y = size // 2 - 100
    draw.text((logo_x, logo_y), logo_text, fill=PURPLE, font=font_logo)

    # Tagline (multiline)
    bbox_tagline = draw.textbbox((0, 0), tagline, font=font_tagline)
    tagline_width = bbox_tagline[2] - bbox_tagline[0]
    tagline_x = (size - tagline_width) // 2
    tagline_y = logo_y + logo_height + 40
    draw.multiline_text((tagline_x, tagline_y), tagline, fill=WHITE, font=font_tagline, align='center')

    img.save('social-assets/instagram-post-purple.png')
    print('✅ Created instagram-post-purple.png')

# 4. Favicon
def generate_favicon(size=512):
    """Generate favicon with purple S"""
    img = Image.new('RGB', (size, size), BG_DARK)
    draw = ImageDraw.Draw(img)

    font_size = int(size * 0.65)
    font = get_font(font_size, bold=True)
    text = "S"

    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    x = (size - text_width) // 2
    y = (size - text_height) // 2

    draw.text((x, y), text, fill=PURPLE, font=font)

    # Save multiple sizes
    for fav_size in [16, 32, 48, 180, 192, 512]:
        resized = img.resize((fav_size, fav_size), Image.Resampling.LANCZOS)
        resized.save(f'social-assets/favicon-{fav_size}x{fav_size}.png')
        print(f'✅ Created favicon-{fav_size}x{fav_size}.png')

# Main execution
if __name__ == '__main__':
    # Create output directory
    os.makedirs('social-assets', exist_ok=True)

    print('🎨 Generating Selira AI social media assets with purple branding...\n')

    # Generate all assets
    generate_logo_main()
    generate_logo_square()
    generate_profile_circle()
    generate_profile_square()
    generate_twitter_banner()
    generate_facebook_cover()
    generate_instagram_post()
    generate_favicon()

    print('\n✅ All assets generated successfully in social-assets/ directory!')
