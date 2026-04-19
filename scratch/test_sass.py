import sass
try:
    print("Testing scale(1):")
    result = sass.compile(string='.test { transform: scale(1); }')
    print(result)
except Exception as e:
    print(f"FAILED: {e}")

try:
    print("\nTesting Scale(1):")
    result = sass.compile(string='.test { transform: Scale(1); }')
    print(result)
except Exception as e:
    print(f"FAILED: {e}")

try:
    print("\nTesting grayScale(1):")
    result = sass.compile(string='.test { filter: grayScale(1); }')
    print(result)
except Exception as e:
    print(f"FAILED: {e}")

try:
    print("\nTesting Grayscale(1):")
    result = sass.compile(string='.test { filter: Grayscale(1); }')
    print(result)
except Exception as e:
    print(f"FAILED: {e}")
