@echo off
node -e "const fs=require('fs');let c=fs.readFileSync('components/home/HomeLanding.corrupted.backup.tsx','utf8');c=c.replace(/import.*Tiranga.*\n/g,'');c=c.replace(/<Tiranga[\s\S]*?<\/Tiranga[^>]*>/g,'');c=c.replace('const popularSearches','const popularSearches');fs.writeFileSync('components/home/HomeLanding.tsx',c);"
echo Backup restored and cleaned
