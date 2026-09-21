@echo off
pushd "d:\aaj\digital-desk-main (2)\digital-desk-main"

echo %DATE% %TIME% - Running tsx direct test
npx tsx scripts\tmp-direct-test.ts
echo %TIME% - Done

popd
