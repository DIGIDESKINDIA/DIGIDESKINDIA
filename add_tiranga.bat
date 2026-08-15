@echo off
node -e "const fs=require('fs');let c=fs.readFileSync('components/home/HomeLanding.tsx','utf8');c=c.replace(/import \{ useTheme \} from "@\/components\/theme\/ThemeProvider";/,'import { useTheme } from "@/components/theme/ThemeProvider";\nimport TirangaHero from "./TirangaHero";');fs.writeFileSync('components/home/HomeLanding.tsx',c);"
echo TirangaHero import added
