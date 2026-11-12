@echo off
title Downloading GCSE papers
echo Downloading every past paper, mark scheme and Maths Genie sheet into Downloads\gcse-papers ...
echo This takes a while (about 715 files). You can leave it running.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0get-gcse-papers.ps1"
pause
