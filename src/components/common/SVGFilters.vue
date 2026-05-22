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
    </defs>
  </svg>
</template>
