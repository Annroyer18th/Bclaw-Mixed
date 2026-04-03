import os
from PIL import Image, ImageDraw, ImageFont

def create_test_images(directory, count=5):
    """
    Create test images in the specified directory.
    Each image has different content and colors.
    """
    os.makedirs(directory, exist_ok=True)
    
    # Create images with different properties
    colors = [
        (255, 0, 0),      # Red
        (0, 255, 0),      # Green
        (0, 0, 255),      # Blue
        (255, 255, 0),    # Yellow
        (128, 128, 128),  # Gray
    ]
    
    print(f"Creating {count} test images in '{directory}'...")
    
    for i in range(count):
        # Create image with solid color
        color = colors[i % len(colors)]
        img = Image.new('RGB', (400, 300), color=color)
        
        # Add text
        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("arial.ttf", 40)
        except:
            font = ImageFont.load_default()
        
        text = f"Test Image {i+1}"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        position = ((400 - text_width) // 2, (300 - text_height) // 2)
        draw.text(position, text, fill=(255, 255, 255) if sum(color) < 382 else (0, 0, 0), font=font)
        
        # Save image
        filename = f"test_{i+1}.jpg"
        filepath = os.path.join(directory, filename)
        img.save(filepath)
        print(f"  Created: {filename}")
    
    print(f"Successfully created {count} test images!")

if __name__ == "__main__":
    create_test_images("d:/C/TestProject/test-files", 5)
