@echo off
node -e "const fs=require('fs');let c=fs.readFileSync('components/home/HomeLanding.tsx','utf8');let start=c.indexOf('<div className="relative z-10">');let end=c.indexOf('</div>',start)+6;let left=c.substring(0,start);let right=c.substring(end);c=left+'<div className="relative z-10">\n              ... (LEFT CONTENT HERE) ...\n            </div>\n\n            <div className="relative hidden lg:block">\n              <TirangaHero />\n            </div>'+right;fs.writeFileSync('components/home/HomeLanding.tsx',c);"
echo Hero section fix attempted
