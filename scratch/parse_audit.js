import fs from 'node:fs/promises';
import path from 'node:path';

async function run() {
  const filePath = path.resolve('scratch/audit_report.txt');
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const violations = [];
  for (const line of lines) {
    if (line.includes('Animación manual detectada')) {
      const match = line.match(/^\[(ERROR|WARNING)\]\s+(.*?):(\d+)\s+->\s+(.*)$/);
      if (match) {
        violations.push({
          severity: match[1],
          file: match[2].trim(),
          line: parseInt(match[3]),
          message: match[4].trim()
        });
      }
    }
  }

  // Group by file
  const groups = {};
  for (const v of violations) {
    if (!groups[v.file]) {
      groups[v.file] = [];
    }
    groups[v.file].push(v);
  }

  // Sort files by number of violations descending
  const sortedFiles = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

  let output = `# POKE VICIO - REPORTE DE ANIMACIONES Y TRANSICIONES MANUALES\n\n`;
  output += `En esta auditoría se identificaron un total de **${violations.length}** transiciones y animaciones CSS manuales (\`transition:\`) que deben ser migradas a GSAP, excluyendo la carpeta \`showdown/\`.\n\n`;
  
  output += `## Resumen de Violaciones por Componente/Área\n\n`;
  output += `| Componente / Archivo | Nro de Violaciones | Ubicación |\n`;
  output += `| :--- | :---: | :--- |\n`;

  for (const file of sortedFiles) {
    output += `| \`${path.basename(file)}\` | ${groups[file].length} | \`${file}\` |\n`;
  }
  output += `\n\n## Detalle Completo de Archivos y Líneas a Migrar\n\n`;

  for (const file of sortedFiles) {
    output += `### 📁 [${path.basename(file)}](file:///${file.replace(/\\/g, '/')})\n`;
    output += `**Ubicación:** \`${file}\` (${groups[file].length} violaciones)\n\n`;
    output += `| Línea | Tipo | Detalle de la Regla |\n`;
    output += `| :---: | :--- | :--- |\n`;
    for (const v of groups[file]) {
      output += `| ${v.line} | \`${v.severity}\` | ${v.message} |\n`;
    }
    output += `\n---\n\n`;
  }

  const outputPath = path.resolve('scratch/reporte_animaciones_gsap.md');
  await fs.writeFile(outputPath, output, 'utf-8');
  console.log(`Reporte generado exitosamente en: ${outputPath}`);
}

run().catch(console.error);
