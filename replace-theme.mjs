import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    let list = fs.readdirSync(dir);
    list.forEach(function(file) {
        if (file === 'node_modules' || file === 'dist' || file.startsWith('.')) return;
        file = dir + '/' + file;
        let stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.html') || file.endsWith('.ts') || file.endsWith('.css')) { 
            results.push(file);
        }
    });
    return results;
}

const files = walk('.');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Backgrounds & glass panels
    content = content.replace(/bg-\[\#020202\]/g, 'bg-[#f5f5f5]');
    content = content.replace(/background-color: #020202;/g, 'background-color: #f5f5f5;');
    content = content.replace(/color: #f8fafc;/g, 'color: #1e293b;');
    
    // Update glass-panel in inline css
    content = content.replace(/background: rgba\(10, 10, 10, 0\.6\);/g, 'background: rgba(255, 255, 255, 0.8);');
    content = content.replace(/border: 1px solid rgba\(255, 255, 255, 0\.08\);/g, 'border: 1px solid rgba(0, 0, 0, 0.05);');
    content = content.replace(/box-shadow: 0 8px 32px 0 rgba\(0, 0, 0, 0\.4\);/g, 'box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.03);');
    content = content.replace(/border-color: rgba\(255, 255, 255, 0\.15\);/g, 'border-color: rgba(0, 0, 0, 0.1);');
    
    // Tailwinds replacements
    content = content.replace(/\btext-white\b/g, 'text-slate-800');
    content = content.replace(/\btext-zinc-200\b/g, 'text-slate-800');
    content = content.replace(/\btext-zinc-300\b/g, 'text-slate-700');
    content = content.replace(/\btext-zinc-400\b/g, 'text-slate-600');
    content = content.replace(/\btext-zinc-500\b/g, 'text-slate-500');
    content = content.replace(/\btext-zinc-600\b/g, 'text-slate-400');
    content = content.replace(/\btext-zinc-700\b/g, 'text-slate-300');
    content = content.replace(/\btext-zinc-100\b/g, 'text-slate-800');
    
    content = content.replace(/\bbg-zinc-900\b/g, 'bg-slate-100');
    content = content.replace(/\bbg-black\/40\b/g, 'bg-white/80');
    content = content.replace(/\bbg-black\/50\b/g, 'bg-slate-100/90');
    content = content.replace(/\bbg-black\/60\b/g, 'bg-slate-100/90');
    
    content = content.replace(/\bbg-white\/5\b/g, 'bg-slate-50 border border-slate-200');
    content = content.replace(/\bborder-white\/5\b/g, 'border-slate-200');
    content = content.replace(/\bbg-white\/10\b/g, 'bg-slate-100');
    content = content.replace(/\bborder-white\/10\b/g, 'border-slate-200');
    content = content.replace(/\bborder-white\/20\b/g, 'border-slate-200');
    content = content.replace(/\bborder-white\/30\b/g, 'border-slate-300');
    content = content.replace(/\bborder-white\/40\b/g, 'border-slate-300');
    content = content.replace(/\bbg-white\/\[0\.02\]\b/g, 'bg-slate-50');
    content = content.replace(/\bgroup-hover:bg-white\/\[0\.05\]\b/g, 'group-hover:bg-slate-100');
    
    // We shouldn't globally replace text-black and bg-white unless careful
    // We already do text-black -> text-white, let's skip that to avoid bugs
    
    content = content.replace(/\bfrom-white\b/g, 'from-slate-800');
    content = content.replace(/\bto-white\/40\b/g, 'to-slate-500');
    
    content = content.replace(/\btext-emerald-400\b/g, 'text-emerald-600');
    content = content.replace(/\btext-sky-400\b/g, 'text-sky-600');
    content = content.replace(/\btext-sky-300\b/g, 'text-sky-600');
    content = content.replace(/\btext-violet-400\b/g, 'text-violet-600');
    content = content.replace(/\btext-violet-100\b/g, 'text-violet-800');
    
    content = content.replace(/\bbg-red-600\/90\b/g, 'bg-red-100/90'); // Critical intervention bg
    content = content.replace(/\btext-white\/70\b/g, 'text-red-900/70'); // Critical intervention subtext
    
    content = content.replace(/brightness-75/g, 'brightness-100');
    content = content.replace(/grayscale/g, ''); // Removes grayscale completely
    
    fs.writeFileSync(file, content, 'utf8');
});
console.log('Replaced successfully');
