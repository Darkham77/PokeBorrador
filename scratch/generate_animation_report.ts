import fs from 'node:fs';

try {
    const output = fs.readFileSync('scratch/audit_output.txt', 'utf-8');
    const lines = output.split('\n');
    const violations = lines.filter(l => l.includes('MIGRACIÓN OBLIGATORIA A GSAP'));

    const report: Record<string, { total: number, files: Record<string, number> }> = {};

    violations.forEach(v => {
        const match = v.match(/\[(ERROR|WARNING)\] (src\/components\/[^:]+)/);
        if (match && match[2]) {
            const filePath = match[2];
            const parts = filePath.split('/');
            const module = parts[2] || 'root';
            
            if (!report[module]) report[module] = { total: 0, files: {} };
            report[module].total++;
            report[module].files[filePath] = (report[module].files[filePath] || 0) + 1;
        }
    });

    console.log('# Reporte Actualizado de Migración GSAP\n');
    const sortedModules = Object.entries(report).sort((a, b) => b[1].total - a[1].total);

    sortedModules.forEach(([module, data]) => {
        console.log(`## 📁 Módulo: ${module.toUpperCase()} (${data.total} incidencias)`);
        const sortedFiles = Object.entries(data.files).sort((a, b) => b[1] - a[1]);
        sortedFiles.forEach(([file, count]) => {
            console.log(`- [ ] \`${file}\`: **${count}**`);
        });
        console.log('');
    });

} catch (e) {
    console.error('Error al generar el reporte:', e.message);
}
