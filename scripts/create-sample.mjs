// Small original, five-page PDF. No dependency is needed to recreate it.
import { writeFileSync } from 'node:fs';
const pages = [
  ['Donde empieza la calma','Un relato breve para leer sin prisa.','Entre páginas'],
  ['La ventana abierta','Clara llegó al pueblo un martes, con una maleta pequeña y demasiadas cosas pendientes. La casa de su abuela olía a madera, a limón y a ese silencio que no pide explicaciones.\n\nDejó el teléfono sobre la mesa. Al abrir la ventana, entró una brisa tibia que movió las cortinas como si la casa hubiera estado esperando su regreso.\n\nEn el alféizar encontró una taza azul. Debajo había un papel doblado: «No tienes que resolverlo todo hoy».\n\nClara se sentó. Por primera vez en mucho tiempo, no hizo nada más.'],
  ['Una costumbre pequeña','A la mañana siguiente salió a comprar pan. El camino bordeaba un jardín lleno de plantas sin nombre. Una mujer regaba con una jarra de cristal y saludó sin preguntar de dónde venía.\n\nEn la panadería, Clara eligió dos piezas. Una para el desayuno. La otra, sin saber todavía para quién.\n\nAl regresar dejó el segundo pan junto a la puerta del jardín. La mujer levantó la jarra a modo de brindis.\n\nNo hablaron. A veces una amistad empieza así: con algo sencillo que encuentra su lugar.'],
  ['El libro de la mesa','Esa tarde llovió. Clara encontró un libro con una flor seca entre sus páginas. No recordaba haberlo leído, aunque reconoció la letra de su abuela en el margen.\n\n«Aquí me quedé», decía, junto a una frase subrayada.\n\nClara preparó té y empezó en la primera página. Afuera, la lluvia desdibujaba el jardín. Dentro, cada palabra parecía ordenar un rincón que llevaba mucho tiempo revuelto.\n\nCuando oscureció, guardó una hoja entre las páginas. No porque quisiera terminar, sino porque sabía que la historia seguiría allí mañana.'],
  ['Un lugar al que volver','El domingo hizo la maleta. Esta vez no le pareció pequeña. Cabían la taza azul, el libro y una bolsa de pan para el camino.\n\nAntes de cerrar la ventana, Clara miró el jardín. La mujer de la jarra levantó una mano. Clara sonrió.\n\nComprendió entonces que la calma no era quedarse para siempre en aquella casa. Era aprender a dejar una ventana abierta dentro de sí.\n\nY volver, de vez en cuando, a las cosas que la hacían sentirse en casa.\n\nFin.']
];
const objects=[];const add=s=>{objects.push(s);return objects.length;};
const esc=s=>s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
const wrap=(s,max)=>{const lines=[];for(const paragraph of s.split('\n')){let line='';for(const word of paragraph.split(' ')){if((line+' '+word).trim().length>max){lines.push(line);line=word;}else line=(line+' '+word).trim();}lines.push(line);}return lines;};
add('<< /Type /Catalog /Pages 2 0 R >>');add('');add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>');add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>');
const refs=[];
for(let i=0;i<pages.length;i++){
 const [title,body,author]=pages[i]; let c='0.988 0.98 0.953 rg 0 0 420 595 re f\n0.2 0.26 0.2 rg\n';
 c+='BT /F1 9 Tf 42 551 Td (ENTRE P'+String.fromCharCode(193)+'GINAS) Tj ET\n';
 c+=`BT /F${i===0?2:1} ${i===0?28:23} Tf 42 ${i===0?380:490} Td (${esc(title)}) Tj ET\n`;
 const lines=wrap(body,48);let y=i===0?320:444;
 for(const line of lines){c+=`BT /F1 13 Tf 42 ${y} Td (${esc(line)}) Tj ET\n`;y-=21;}
 if(author)c+=`BT /F1 12 Tf 42 140 Td (${esc(author)}) Tj ET\n`;
 c+=`BT /F1 10 Tf 205 28 Td (${i+1}) Tj ET\n`;
 const stream=add(`<< /Length ${Buffer.byteLength(c,'latin1')} >>\nstream\n${c}endstream`);
 refs.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 420 595] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${stream} 0 R >>`));
}
objects[1]=`<< /Type /Pages /Kids [${refs.map(n=>n+' 0 R').join(' ')}] /Count ${refs.length} >>`;
let out='%PDF-1.4\n';const offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(out,'latin1'));out+=`${i+1} 0 obj\n${o}\nendobj\n`;});const xref=Buffer.byteLength(out,'latin1');out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
writeFileSync(new URL('../seed/sample.pdf',import.meta.url),Buffer.from(out,'latin1'));
