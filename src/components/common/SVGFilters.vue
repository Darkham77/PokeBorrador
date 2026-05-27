<template>
  <svg
    style="visibility: hidden; position: absolute;"
    width="0"
    height="0"
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
  >
    <defs>
      <filter id="pixel-outline-optimized">
        <feMorphology
          in="SourceAlpha"
          result="expanded"
          operator="dilate"
          radius="1"
        />
        <feFlood
          flood-color="black"
          result="black"
        />
        <feComposite
          in="black"
          in2="expanded"
          operator="in"
          result="outline"
        />
        <feMerge>
          <feMergeNode in="outline" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="pixel-outline-optimized-3px">
        <feMorphology
          in="SourceAlpha"
          result="expanded"
          operator="dilate"
          radius="3"
        />
        <feFlood
          flood-color="black"
          result="black"
        />
        <feComposite
          in="black"
          in2="expanded"
          operator="in"
          result="outline-raw"
        />
        <feGaussianBlur
          in="outline-raw"
          stdDeviation="0.5"
          result="outline"
        />
        <feMerge>
          <feMergeNode in="outline" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="pixel-outline-ice">
        <feMorphology
          in="SourceAlpha"
          result="expanded"
          operator="dilate"
          radius="8"
        />
        <feFlood
          flood-color="#e0ffff"
          result="ice-color"
        />
        <feComposite
          in="ice-color"
          in2="expanded"
          operator="in"
          result="outline"
        />
        <feMerge>
          <feMergeNode in="outline" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="pixel-silhouette-optimized">
        <!-- 1. Body: Solid Black -->
        <feColorMatrix
          in="SourceAlpha"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
          result="black-body"
        />
        
        <!-- 2. Outline: White (1.0px Dilate - SourceAlpha) -->
        <feMorphology
          in="SourceAlpha"
          operator="dilate"
          radius="1.0"
          result="expanded"
        />
        <feComposite
          in="expanded"
          in2="SourceAlpha"
          operator="out"
          result="outline-mask"
        />
        
        <!-- 3. Convert mask to white outline -->
        <feColorMatrix
          in="outline-mask"
          type="matrix"
          values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"
          result="white-outline-sharp"
        />
        
        <!-- 4. Smooth the outline -->
        <feGaussianBlur
          in="white-outline-sharp"
          stdDeviation="1.0"
          result="white-outline-blur"
        />
        
        <!-- 5. Final Merge: Body on top of Outline -->
        <feMerge>
          <feMergeNode in="white-outline-blur" />
          <feMergeNode in="black-body" />
        </feMerge>
      </filter>

      <filter
        id="pixel-energy-optimized"
        x="-100%"
        y="-100%"
        width="300%"
        height="300%"
      >
        <!-- 1. White Body (Sharp) -->
        <feColorMatrix
          in="SourceAlpha"
          type="matrix"
          values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"
          result="white-body-sharp"
        />

        <!-- 2. Soft White Halo around the body -->
        <feMorphology
          in="SourceAlpha"
          operator="dilate"
          radius="2.0"
          result="white-halo-expanded"
        />
        <feColorMatrix
          in="white-halo-expanded"
          type="matrix"
          values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"
          result="white-halo-color"
        />
        <feGaussianBlur
          in="white-halo-color"
          stdDeviation="3.0"
          result="white-body-halo"
        />

        <!-- 3. Thick Blue Outline -->
        <feMorphology
          in="SourceAlpha"
          operator="dilate"
          radius="3.5"
          result="outline-expanded"
        />
        <feComposite
          in="outline-expanded"
          in2="SourceAlpha"
          operator="out"
          result="outline-mask"
        />
        <feColorMatrix
          in="outline-mask"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0.8  0 0 0 0 1  0 0 0 1 0"
          result="blue-outline"
        />
        <feGaussianBlur
          in="blue-outline"
          stdDeviation="0.8"
          result="blue-outline-blur"
        />

        <!-- 4. Massive Blue Glow Aura radiating outwards -->
        <feMorphology
          in="SourceAlpha"
          operator="dilate"
          radius="8.0"
          result="glow-expanded"
        />
        <feColorMatrix
          in="glow-expanded"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0.7  0 0 0 0 1  0 0 0 1 0"
          result="blue-glow-raw"
        />
        <feGaussianBlur
          in="blue-glow-raw"
          stdDeviation="12.0"
          result="blue-glow-aura"
        />

        <!-- 5. Final Merge: Aura on bottom, then thick Blue Outline, then Soft White Halo, then solid White Body on top -->
        <feMerge>
          <feMergeNode in="blue-glow-aura" />
          <feMergeNode in="blue-outline-blur" />
          <feMergeNode in="white-body-halo" />
          <feMergeNode in="white-body-sharp" />
        </feMerge>
      </filter>
    </defs>
  </svg>
</template>
